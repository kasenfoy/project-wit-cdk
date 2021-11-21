import * as cdk from '@aws-cdk/core';
import * as iam from 'monocdk/aws-iam';
import * as lambda from 'monocdk/aws-lambda';
import * as path from "path";
import * as apigateway from 'monocdk/aws-apigateway'

export class ProjectWitAuth extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const awsAccountId = '326480716745'
        /** IAM Role **/
            // Role Creation (Dynamo User)
        const dynamoAuthRole = new iam.Role(this, 'dynamo-auth-role', {
            roleName: 'dynamo-auth-role',
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
        });

        /** IAM **/
        // Policy Statements
        const allowDynamoCrudPolicyStatement = new iam.PolicyStatement({
            sid: 'allowDynamoCrudOperations',
            effect: iam.Effect.ALLOW,
            resources: [
                // Match all WIT related dynamo tables.
                'arn:aws:dynamodb:::table/wit-*-*'
            ],
            actions: [
                "dynamodb:BatchGetItem",
                "dynamodb:BatchWriteItem",
                "dynamodb:ConditionCheckItem",
                "dynamodb:PutItem",
                "dynamodb:DescribeTable",
                "dynamodb:DeleteItem",
                "dynamodb:GetItem",
                "dynamodb:Scan",
                "dynamodb:Query",
                "dynamodb:UpdateItem"
            ]
        });

        const allowDynamoStreamAndIndexInformationPolicyStatement = new iam.PolicyStatement({
            sid: 'allowDynamoStreamAndIndexInformation',
            effect: iam.Effect.ALLOW,
            resources: [
                // The resources matched should be in the from of:
                // awsservice:account:region:table/projectname-stage-tablename/index|stream/*
                // partial ex. wit-production-tasks will match.
                // full ex. arn:aws:dynamodb:::table/wit-production-tasks/index/*
                'arn:aws:dynamodb:::table/wit-*-*/index/*',
                'arn:aws:dynamodb:::table/wit-*-*/stream/*'
            ],
            actions: [
                "dynamodb:GetShardIterator",
                "dynamodb:Scan",
                "dynamodb:Query",
                "dynamodb:DescribeStream",
                "dynamodb:GetRecords",
                "dynamodb:ListStreams"
            ]
        })

        // This policy allows the iam role to assume itself.
        // I have noted that this is needed when a role is responsible for executing a lambda.
        // The lambda is executed with a derived role and thus needs to inherit permissions
        // to be able to assume the parent role (self)
        const dynamoAuthRoleAssumeSelfPolicyStatement = new iam.PolicyStatement({
            sid: 'dynamoAuthRoleAssumeSelf',
            effect: iam.Effect.ALLOW,
            actions: [
                "sts:AssumeRole",
            ],
            resources: [
                dynamoAuthRole.roleArn
            ]
        })



        // Policy Assignment (Add all above policies to the role)
        dynamoAuthRole.addToPolicy(allowDynamoCrudPolicyStatement);
        dynamoAuthRole.addToPolicy(allowDynamoStreamAndIndexInformationPolicyStatement);
        dynamoAuthRole.addToPolicy(dynamoAuthRoleAssumeSelfPolicyStatement);

        /** Lambda **/

        // Create a lambda function, this is what is responsible for retrieving the temporary credentials.
        // The code for this function is in ./lambda/credential-retriever.py
        // We also must add the role arn that is supposed to be assumed
        // In this case it is also the role that is executing the lambda
        const credentialRetrieverLambda = new lambda.Function(this, 'credential-retriever-lambda', {
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            handler: 'credential-retriever.main',
            runtime: lambda.Runtime.PYTHON_3_6,
            role: dynamoAuthRole,
            environment: {
                roleArn: dynamoAuthRole.roleArn
            }
        });

        // API Gateway
        // const apiGatewayWitAuth = new apigateway.RestApi(this, 'project-wit-auth');
        // const witAuthIntegration = new apigateway.LambdaIntegration(
        //
        // );

        /** API Gateway NEEDS EVALUATING AND COMMENTING **/
        const witAuthIntegration = new apigateway.LambdaIntegration(credentialRetrieverLambda,
            {
                // authorizationType: apigateway.AuthorizationType.IAM
                // requestTemplates: {"application/json": '{ "statusCode": "200" }'}
            });

        // const getBooks = books.addMethod('GET', new apigateway.HttpIntegration('http://amazon.com'), {
        //     authorizationType: apigateway.AuthorizationType.IAM
        // });


        const apiGatewayWitAuth = new apigateway.LambdaRestApi(this, 'project-wit-auth', {
            // defaultIntegration: witAuthIntegration,
            handler: credentialRetrieverLambda,
            proxy: false
        });

        const authResource = apiGatewayWitAuth.root.addResource('auth');
        const authMethod = authResource.addMethod('GET', witAuthIntegration)

        // This should be a policy (If it is even needed?)
        dynamoAuthRole.attachInlinePolicy(new iam.Policy(this, 'AllowBooks', {
            statements: [
                new iam.PolicyStatement({
                    actions: [ 'execute-api:Invoke' ],
                    effect: iam.Effect.ALLOW,
                    resources: [ authMethod.methodArn ]
                })
            ]
        }))


        // // Policy
        // const allowDynamoInteractionsPolicy = new iam.Policy(this, 'allow-dynamo-interactions-policy', {
        //     policyName: 'allow-dynamo-interactions-policy',
        //
        // })


        // Policy
        // const policy = new iam.Policy()

        // new s3.Bucket(this, 'MyFirstBucket', {
        //     versioned: true
        // });
    }
}