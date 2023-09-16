/* 

ABOUT THIS NODE.JS EXAMPLE: This example works with AWS SDK for JavaScript version 3 (v3),
which is available at https://github.com/aws/aws-sdk-js-v3. This example is in the 'AWS SDK for JavaScript v3 Developer Guide' at
https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/using-lambda-function-prep.html.

Purpose:
startstopserver.ts sets the desiredCount for an ECS Service after authenticating with a ( poor ) password. ( min 0, max 1)

Inputs (into code):
- REGION
- SERVICE_NAME ( or ARN )
- CLUSTER_ARN
- PASSWORD

*/
"use strict";

import { ECSClient, UpdateServiceCommand } from '@aws-sdk/client-ecs';
import { APIGatewayEvent, APIGatewayProxyHandler, Context } from 'aws-lambda';

//Set the AWS Region
const REGION = process.env.REGION; 

const SERVICE_NAME = process.env.SERVICE_NAME;  
const CLUSTER_ARN = process.env.CLUSTER_ARN; 
const PASSWORD = process.env.PASSWORD;

export const handler: APIGatewayProxyHandler = async (event: APIGatewayEvent, context: Context) => {
    console.log("request: " + JSON.stringify(event));
    let responseCode = 400;
    let message = "authentication failed";

    const params = {
        desiredCount: 1,
        service: SERVICE_NAME,
        cluster: CLUSTER_ARN
    }
    
    if (event.queryStringParameters && event.queryStringParameters.desiredCount !== undefined) {
        let count = Math.min(Math.max(+event.queryStringParameters.desiredCount, 0), 1);
        params.desiredCount = count;
        console.log("changing desiredCount to " + count);
    }

    if (event.queryStringParameters && event.queryStringParameters.key) {
        let key = event.queryStringParameters.key;
        if (key == PASSWORD) {
            const client = new ECSClient({ region: REGION });
            console.log("starting service " + JSON.stringify(params));
            message = "authentication success";
            responseCode = 200;


            const updateCommand = new UpdateServiceCommand(params);

            const updateCommandResult = await client.send(updateCommand);
            console.log(updateCommandResult);
        }
    }

    let responseBody = {
        message: message,
    };
    
    // The output from a Lambda proxy integration must be 
    // in the following JSON object. The 'headers' property 
    // is for custom response headers in addition to standard 
    // ones. The 'body' property  must be a JSON string. For 
    // base64-encoded payload, you must also set the 'isBase64Encoded'
    // property to 'true'.
    return {
        statusCode: responseCode,
        headers: {
        },
        body: JSON.stringify(responseBody)
    };
};
