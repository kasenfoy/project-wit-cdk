import * as cdk from '@aws-cdk/core';
import * as iam from 'monocdk/aws-iam';
import * as lambda from 'monocdk/aws-lambda';
import * as path from "path";
import * as apigateway from 'monocdk/aws-apigateway'
import * as dynamodb from 'monocdk/aws-dynamodb'
import * as s3 from 'monocdk/aws-s3'
import {BlockPublicAccess} from "monocdk/aws-s3";


interface ProjectWitProps extends cdk.StackProps{
    stage: string,
}


// TODO Enabled CORS Manually, need to set it explicitly.
export class ProjectWitAuth extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: ProjectWitProps) {
        super(scope, id, props);

        const awsAccountId = '326480716745'
        /** IAM Role **/
            // Role Creation (Dynamo User)
        const dynamoAuthRole = new iam.Role(this, 'dynamo-auth-role-' + props.stage, {
            roleName: 'dynamo-auth-role-' + props.stage,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
        });

        /** IAM **/
        // Policy Statements
        const allowDynamoCrudPolicyStatement = new iam.PolicyStatement({
            sid: 'allowDynamoCrudOperations',
            effect: iam.Effect.ALLOW,
            resources: [
                'arn:aws:dynamodb:*:*:table/project-wit-*-' + props.stage,
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
                // 'arn:aws:dynamodb:*:' + awsAccountId + ':table/dev-tasks',
                'arn:aws:dynamodb:*:*:table/project-wit-*-' + props.stage + '/index/*',
                'arn:aws:dynamodb:*:*:table/project-wit-*-' + props.stage + '/stream/*',
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
        const credentialRetrieverLambda = new lambda.Function(this, 'credential-retriever-lambda-' + props.stage, {
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            handler: 'credential-retriever.main',
            runtime: lambda.Runtime.PYTHON_3_6,
            role: dynamoAuthRole,
            environment: {
                roleArn: dynamoAuthRole.roleArn
            }
        });


        /*** API Gateway ***/
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


        const apiGatewayWitAuth = new apigateway.LambdaRestApi(this, 'project-wit-auth-' + props.stage, {
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


        /*** DynamoDB ***/

        // Setup for tables that share common setup.
        let tableName: Array<string> = ['tasks', 'tags', 'sprints', 'comments', 'users', 'lanes']
        let tables = new Array<dynamodb.Table>();

        // For each tableName
        tableName.map((name: string) => {

            // Create the table
            let table = new dynamodb.Table(this, 'project-wit-' + name + '-' + props.stage, {
                partitionKey: {
                    name: 'id',
                    type: dynamodb.AttributeType.STRING,
                },
                billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
                tableName: 'project-wit-' + name + '-' + props.stage
                // TODO Implement Kinesis stream as a nice to have integration: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-dynamodb-readme.html#kinesis-stream
            })

            // Push it to array
            tables.push(table);
        })

        /*** S3 ***/
        let bucket = new s3.Bucket(this, 'project-wit-' + props.stage, {
            websiteErrorDocument: 'error.html',
            websiteIndexDocument: 'index.html',
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });



        /*** Outputs ***/
        // create website url
        new cdk.CfnOutput(this, 'website-url', {
            value: bucket.bucketWebsiteUrl,
            description: 'The URL of the static website',
            exportName: 'webSiteStaticUrl',
        });

        new cdk.CfnOutput(this, 'website-auth-api', {
            value: `https://${apiGatewayWitAuth.restApiId}.execute-api.${this.region}.amazonaws.com/prod/auth`,
            description: 'The URL of the auth API',
            exportName: 'webSiteAuthUrl',
        })
    }
}