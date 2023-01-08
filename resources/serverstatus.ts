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

import { ECSClient, ListServicesCommand, DescribeServicesCommand, ListTasksCommand, DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { EC2Client, DescribeNetworkInterfacesCommand } from '@aws-sdk/client-ec2';

//Set the AWS Region
const REGION = process.env.REGION;
const SERVICE_ARN = process.env.SERVICE_ARN;
const CLUSTER_ARN = process.env.CLUSTER_ARN;

const client = new ECSClient({ region: REGION });
const ec2Client = new EC2Client({ region: REGION });

exports.handler = async (event, context, callback) => {


  const statusResults = await getIPFunction();
  console.log("status results: " + JSON.stringify(statusResults));

  let response = {
    statusCode: 200,
    headers: {
    },
    body: JSON.stringify(statusResults)
  };

  callback(null, response);
};


async function getIPFunction() {

  // Define the object that will hold the data values returned
  let statusResults = {
    running: false,
    ip: "",
  };

  try {

    const ListTasksParams = {
      servicesName: SERVICE_ARN,
      cluster: CLUSTER_ARN,
      desiredStatus: "RUNNING"
    };
    const listTasksCommand = new ListTasksCommand(ListTasksParams);

    const listTasks = await client.send(listTasksCommand);
    console.log(listTasks);

    if (listTasks.taskArns.length > 0) {
      const describeTaskParams = {
        cluster: CLUSTER_ARN,
        tasks: listTasks.taskArns
      };


      const describeTaskCommand = new DescribeTasksCommand(describeTaskParams);

      const describeTasks = await client.send(describeTaskCommand);
      console.log(describeTasks);
      const networkInterfaceId = describeTasks.tasks[0].attachments[0].details.find(x => x.name === "networkInterfaceId").value;

      console.log("found network interfaceid " + networkInterfaceId);

      const describeNetworkInterfacesParams = {
        NetworkInterfaceIds: [networkInterfaceId]
      };

      const describeNetworkInterfacesCommand = new DescribeNetworkInterfacesCommand(ListTasksParams);

      const networkInterfaces = await ec2Client.send(describeNetworkInterfacesCommand);
      console.log(networkInterfaces);
      const publicIp = networkInterfaces.NetworkInterfaces.find(x => x.Association != undefined).Association.PublicIp;
      console.log("found public IP " + publicIp);
      statusResults.running = true;
      statusResults.ip = publicIp + ":2456";
    }

  } catch (error) {
    console.log(error);
  }

  console.log(JSON.stringify(statusResults));


  return statusResults;
}

