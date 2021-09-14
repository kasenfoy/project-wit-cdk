import boto3
import os
import json


def main(event, context):
    client = boto3.client('sts')
    roleArn = os.environ['roleArn']
    cred = client.assume_role(
        RoleArn=roleArn,
        RoleSessionName='string'
    )
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
