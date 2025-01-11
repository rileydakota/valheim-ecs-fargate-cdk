/* 

This code was created from sample code provided for the AWS SDK for JavaScript version 3 (v3),
which is available at https://github.com/aws/aws-sdk-js-v3. This example is in the 'AWS SDK for JavaScript v3 Developer Guide' at
https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/using-lambda-function-prep.html.

Purpose:
This function queries the server status of an ecs container, and if it's running returns the public ip

Inputs (into code):
- REGION
- SERVICE_ARN - service arn or name of the ecs service
- CLUSTER_ARN  - cluster arn or name of the ecs cluster

*/
"use strict";

import { ECSClient, DescribeTasksCommandInput, ListTasksCommand, DescribeTasksCommand, ListTasksCommandInput } from '@aws-sdk/client-ecs';
import { EC2Client, DescribeNetworkInterfacesCommand, DescribeNetworkInterfacesCommandInput } from '@aws-sdk/client-ec2';
import { APIGatewayEvent, APIGatewayProxyHandler, Context } from 'aws-lambda';

//Set the AWS Region
if (!process.env.REGION) throw new Error("REGION must be defined!");
const REGION = process.env.REGION;

if (!process.env.SERVICE_ARN) throw new Error("SERVICE_ARN must be defined!");
const SERVICE_ARN = process.env.SERVICE_ARN;

if (!process.env.CLUSTER_ARN) throw new Error("CLUSTER_ARN must be defined!");
const CLUSTER_ARN = process.env.CLUSTER_ARN;

const ecsClient = new ECSClient({ region: REGION });
const ec2Client = new EC2Client({ region: REGION });

/**
 * Everything here has the assumption there is only one task.
 */
export const handler: APIGatewayProxyHandler = async (event: APIGatewayEvent, context: Context) => {
  console.log(`New getServerStatus request: ${JSON.stringify(event)}`);
  console.log(`With context: ${JSON.stringify(context)}`);

  const statusResults = await getIPFunction();
  console.log("status results: " + JSON.stringify(statusResults));

  return {
    statusCode: 200,
    headers: {
    },
    body: JSON.stringify(statusResults)
  };
};

async function getIPFunction() {

  // Define the object that will hold the data values returned
  let statusResults = {
    running: false,
    ip: "",
  };

  try {

    const listTasksCommandInput: ListTasksCommandInput = {
      serviceName: SERVICE_ARN,
      cluster: CLUSTER_ARN,
      desiredStatus: "RUNNING"
    }
    const listTasksCommandResult = await ecsClient.send(new ListTasksCommand(listTasksCommandInput));
    console.log(listTasksCommandResult);

    if (!listTasksCommandResult.taskArns || listTasksCommandResult.taskArns.length <= 0) return statusResults;

    const networkInterfaceId = await getNetworkInterfaceId(CLUSTER_ARN, listTasksCommandResult.taskArns);

    const describeNetworkInterfacesInput: DescribeNetworkInterfacesCommandInput = {
      NetworkInterfaceIds: [networkInterfaceId]
    }
    const describeNetworkInterfacesResult = await ec2Client.send(new DescribeNetworkInterfacesCommand(describeNetworkInterfacesInput));

    if (!describeNetworkInterfacesResult.NetworkInterfaces || describeNetworkInterfacesResult.NetworkInterfaces.length <= 0) return statusResults;
    const publicIp = describeNetworkInterfacesResult.NetworkInterfaces.find(x => x.Association != undefined)?.Association?.PublicIp;

    console.log("found public IP " + publicIp);
    statusResults.running = true;
    statusResults.ip = publicIp + ":2456";
  } catch (error) {
    console.log(error);
  }

  return statusResults;
}

/**
 * Gets the first network interface ID of the first attachment of the first task in given list of tasks in a cluster
 */
const getNetworkInterfaceId = async (cluster: string, tasks: string[]): Promise<string> => {
  const cmd: DescribeTasksCommandInput = { cluster, tasks };
  const describeTaskCommand = new DescribeTasksCommand(cmd);
  console.log(`Attempting to find network interfaces in ${JSON.stringify(cmd)}`);

  try {
    const result = await ecsClient.send(describeTaskCommand);

    if (!result.tasks) throw new Error('Did not find any tasks');
    const [firstTask] = result.tasks;

    if (!firstTask.attachments) throw new Error(`Task ${firstTask.taskArn} has no attachements`);
    const [firstAttachment] = firstTask.attachments;

    const networkInterfaceId = firstAttachment.details?.find(d => d.name === 'networkInterfaceId')?.value;
    if (!networkInterfaceId) throw new Error(`Could not find a network interface on given attachment: ${JSON.stringify(firstAttachment)}`);
    
    console.debug(`Found interface "${networkInterfaceId}"`);
    return networkInterfaceId;
  } catch (err) {
    // TODO: Upgrade to > Node 16 and use "Error("...", { cause: err })"
    throw new Error(`Failed to get the first network interface ID for the following tasks ${tasks.join(',')} in ${cluster}. Cause: ${JSON.stringify(err)}`);
  }
}
