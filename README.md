# Welcome to Project WIT's CDK TypeScript project!

This package is the infrastructure file for [Project WIT](https://github.com/kasenfoy/ProjectWit) which is a separate 
repository for the React/TypeScript application (The UI essentially)

This package defines all the infrastructure needed for Project WIT as code, which is a powerful use 
of the AWS Cloud Development Kit (CDK)

you can easily deploy your own CDK infrastructure for your own Project WIT instance with a couple pre-requisites/steps

# Prerequisites
 * Have [NodeJS](https://nodejs.org/en/download/) installed
 * Have the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed
 * Have the [AWS CDK CLI](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_install) installed
 * Have an AWS account and IAM Credentials (This is typically up to the developer how you get these.)

# Steps to build/deploy
 * Clone the repository `git clone https://github.com/kasenfoy/project-wit-cdk.git`
 * cd into project `cd project-wit-cdk`
 * Install the packages dependencies `npm install`
 * Modify the CDK Package for your configuration, some examples:
   * You can change the `awsAccountId` for example in the `project-wit-auth.ts` file.
   * You can add adittional resources or remove some of the unecessary DynamoDB Tables in `project-wit-auth.ts`
   * You can create a new stage/stack in the `project-wit-cdk.ts` file. 
   * All sorts of other fun customizations!
 * If you changed your AWS Account/Region, bootsrap it first with `cdk bootstrap`
 * If you are deploying changes, you can check them first with `cdk diff <stack name here>`
 * If you need to know all the stack names available to you run `cdk list`
 * To actually deploy your changes run `cdk deploy`
 * Enjoy!

# Default README contents on cdk package creation

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
