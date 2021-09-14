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
                // 'arn:aws:dynamodb:*:' + awsAccountId + ':table/dev-tasks',
                'arn:aws:dynamodb:::table/wit-*-*',
                // 'arn:aws:dynamodb:::table/wit-*-tasks',
                // 'arn:aws:dynamodb:::table/wit-*-tags',
                // 'arn:aws:dynamodb:::table/wit-*-users',
                // 'arn:aws:dynamodb:::table/wit-*-sprints'
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
                // 'arn:aws:dynamodb:*:' + awsAccountId + ':table/dev-tasks',
                'arn:aws:dynamodb:::table/wit-*-*/index/*',
                'arn:aws:dynamodb:::table/wit-*-*/stream/*',
                // 'arn:aws:dynamodb:::table/wit-*-tags/index/*',
                // 'arn:aws:dynamodb:::table/wit-*-users/index/*',
                // 'arn:aws:dynamodb:::table/wit-*-sprints/index/*',
                // 'arn:aws:dynamodb:::table/wit-*-tasks/stream/*',
                // 'arn:aws:dynamodb:::table/wit-*-tags/stream/*',
                // 'arn:aws:dynamodb:::table/wit-*-users/stream/*',
                // 'arn:aws:dynamodb:::table/wit-*-sprints/stream/*',
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



        // Policy Assignment
        dynamoAuthRole.addToPolicy(allowDynamoCrudPolicyStatement);
        dynamoAuthRole.addToPolicy(allowDynamoStreamAndIndexInformationPolicyStatement);
        dynamoAuthRole.addToPolicy(dynamoAuthRoleAssumeSelfPolicyStatement);

        /** Lambda **/
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