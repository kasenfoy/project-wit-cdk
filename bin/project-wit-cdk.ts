#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ProjectWitCdkStack } from '../lib/project-wit-cdk-stack';
import {ProjectWitAuth} from "../lib/project-wit-auth";

const app = new cdk.App();
new ProjectWitAuth(app, 'project-wit-dev', {
    stage: 'dev'
});

new ProjectWitAuth(app, 'project-wit-beta', {
    stage: 'beta'
})

new ProjectWitAuth(app, 'project-wit-prod', {
    stage: 'prod'
})
