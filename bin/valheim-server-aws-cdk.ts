#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ValheimServerAwsCdkStack } from '../lib/valheim-server-aws-cdk-stack';


const app = new cdk.App();
new ValheimServerAwsCdkStack(app, 'ValheimServerAwsCdkStack');

