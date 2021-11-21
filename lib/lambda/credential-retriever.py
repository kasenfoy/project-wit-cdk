import boto3
import os
import json

# This function is the lambda handler for this package
# It's responsibility is to initialize an AWS STS session
# And then retrieve a set of temporary credentials
# from the role specified in the environment variable 'roleArn'
# This then formats and returns the response for use by project WIT.
def main(event, context):

    # Initialize an STS client.
    client = boto3.client('sts')

    # Specify the role arn that we wish to retrieve credentials for.
    # Note that this role should have the appropriate permissions already specified
    # In this case the roleArn is set up in the CDK application.
    roleArn = os.environ['roleArn']

    # Retrieve the credentials from the STS client.
    # This is done by "assuming" the role.
    # This will return a dict of values with
    #  * Access key id
    #  * Secret access key
    #  * Expiration time
    cred = client.assume_role(
        RoleArn=roleArn,
        RoleSessionName='string'
    )

    # Convert this into the Lambda/API Gateway expected response
    # Then return the formatted data.
    return {
        "statusCode": 200,
        "headers": {},
        "body": json.dumps({
            "AccessKeyId": cred['Credentials']['AccessKeyId'],
            "SecretAccessKey": cred['Credentials']['SecretAccessKey'],
            "Expiration": cred['Credentials']['Expiration'].strftime("%Y-%m-%d %H:%M:%S")
            }),
        "isBase64Encoded": False
    }
