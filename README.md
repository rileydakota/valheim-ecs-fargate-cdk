# valheim-ecs-fargate-cdk

![this could be you!](giphy.gif)

This is a CDK Project for spinning up a [Valheim](https://store.steampowered.com/app/892970/Valheim/) game server on AWS Using [ECS Fargate](https://aws.amazon.com/fargate/?whats-new-cards.sort-by=item.additionalFields.postDateTime&whats-new-cards.sort-order=desc&fargate-blogs.sort-by=item.additionalFields.createdDate&fargate-blogs.sort-order=desc) and [Amazon EFS](https://aws.amazon.com/efs/)!

Uses [valheim-server-docker](https://github.com/lloesche/valheim-server-docker) - thanks to lloesche for putting it together!

## Table of Contents
- [valheim-ecs-fargate-cdk](#valheim-ecs-fargate-cdk)
  - [Table of Contents](#table-of-contents)
  - [Fresh Installation](#fresh-installation)
  - [Installation/Deployment](#installationdeployment)
  - [Configuration](#configuration)
  - [Solution Cost Information](#solution-cost-information)
  - [Common Problems/FAQ](#common-problemsfaq)
    - [How do I find the IP of my server?](#how-do-i-find-the-ip-of-my-server)
      - [Via the ecs-cli:](#via-the-ecs-cli)
      - [Via the AWS Console:](#via-the-aws-console)
  - [To-Do](#to-do)

## Fresh Installation
1. To follow [Installation/Deployment](#installationdeployment), you will first need to install the AWS CLI alongside the AWS CDK. The below will show you how to do so. 
2. First we need to install Node.js which also install NPM. You can download it [here](https://nodejs.org/en/)
3. Once Node is installed you can then install the AWS CLI from [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
   1. Make sure you install the AWS CLI here "C:\Program Files\Amazon\AWSCLIV2"
   2. For other Operating Systems, it should be the same instructions below, but you'll need to research the documentation corresponding to the OS Install.
   3. Next let's open up our AWS Console, where we will create a user in IAM that can create and interact with the CDK and CLI
   4. Go to this link and follow the instructions there to make a user in IAM and grant them the correct rights [link](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html#cli-configure-quickstart-creds)
       1.  **KEEP THE FINAL SCREEN OPEN WHICH HAS YOUR Access key ID && Secret access key!**
   5.  Next we will open a command prompt and type the following "aws configure"
       1.  It will ask you for the AWS Access ID, which you can copy from the AWS Console **(4.1)**
       2.  Your AWS Secret Access Key which is also in your console **(4.2)**
       3.  Default Region Name: You can find this by opening [this](https://us-east-2.console.aws.amazon.com/console/home)
           1.  Click on the Region which is in between your Username & Support. Mine is us-east-2
       4. Default output format: you can leave blank and hit enter. 
   6.  Next we will install the CDK, run this command inside of your command prompt "npm install -g aws-cdk"
   7.  After that we will bootstrap the account with the CDK so we can interact via Command Line. 
   8.  Run the command "cdk bootstrap aws://XXXX/us-east-2"
       1.  Replace XXX with your account number. If you login to the console where you got your region, click on your username and there is a number you can copy next to "My Account" 
       2.  Replace "us-east-2" with the region you specified above in step **(13.3.1)**
       3.  Run the command and you should see the output below
```bash
⏳  Bootstrapping environment aws://YOURACCOUNTNUMBER/us-east-2...
CDKToolkit: creating CloudFormation changeset...
 0/3 | 5:37:16 PM | REVIEW_IN_PROGRESS   | AWS::CloudFormation::Stack | CDKToolkit User Initiated
 0/3 | 5:37:22 PM | CREATE_IN_PROGRESS   | AWS::CloudFormation::Stack | CDKToolkit User Initiated
 0/3 | 5:37:25 PM | CREATE_IN_PROGRESS   | AWS::S3::Bucket       | StagingBucket
 0/3 | 5:37:26 PM | CREATE_IN_PROGRESS   | AWS::S3::Bucket       | StagingBucket Resource creation Initiated
 3/3 | 5:37:47 PM | CREATE_COMPLETE      | AWS::S3::Bucket       | StagingBucket
 3/3 | 5:37:49 PM | CREATE_IN_PROGRESS   | AWS::S3::BucketPolicy | StagingBucketPolicy
 3/3 | 5:37:50 PM | CREATE_IN_PROGRESS   | AWS::S3::BucketPolicy | StagingBucketPolicy Resource creation Initiated
 3/3 | 5:37:50 PM | CREATE_COMPLETE      | AWS::S3::BucketPolicy | StagingBucketPolicy
 3/3 | 5:37:51 PM | CREATE_COMPLETE      | AWS::CloudFormation::Stack | CDKToolkit
 ✅  Environment aws://YOURACCOUNTNUMBER/us-east-2 bootstrapped.
 ```
 17. If you see this detail, then Congrats! You have successfully configured your local machine to use the AWS CLI and CDK. If you need anymore assistance feel free to open an issue and we can help. 
 18. The below instructions will help you finish deploying this to AWS ECS Fargate. Good luck in Valheim!
## Installation/Deployment

Making the assumption you have an AWS Account Already and a valid set of creds configured:

1. Create a Secret named **valheimServerPass** in the same region you plan to deploy the CDK Stack - we reference it by name [here](lib/valheim-server-aws-cdk-stack.ts#L14-17) and pass that value to our container as a secret. valheim-server-docker requires this to be AT LEAST 5 characters (ideally much more). The secret string should be a key value pair as below:

```bash
aws secretsmanager create-secret --name valheimServerPass --secret-string '{"VALHEIM_SERVER_PASS":"SuperSecretServerPassword"}'
```

2. Clone down our source code(then CD into where it is downloaded):

```bash
git clone git@github.com:rileydakota/valheim-ecs-fargate-cdk.git
```

3. Install dependencies:

```bash
npm i
```

4. Configure any server settings you need to change in the code [here](lib/valheim-server-aws-cdk-stack.ts#L66-82) - will absolutely want to change `SERVER_NAME`!

```typescript
    const container = valheimTaskDefinition.addContainer("valheimContainer", {
      image: ecs.ContainerImage.fromRegistry("lloesche/valheim-server"),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "ValheimServer" }),
      environment: {
        SERVER_NAME: "YOUR_SERVER_NAME_HERE",
        SERVER_PORT: "2456",
```

5. Assuming you have already bootstrapped your account via the CDK (see [here](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) if not) - deploy the stack

```
npx cdk deploy
```
6. ![Final Output should look like this](https://i.imgur.com/lHEQMcL.jpg)
7. Enjoy accidentally chopping trees onto your friends powered by AWS!

## Configuration

Coming soon

## Solution Cost Information

Coming soon

## Common Problems/FAQ

### How do I find the IP of my server?

#### Via the ecs-cli:

Install the ecs-cli by running the following (this assumes Linux - for other environments see [here](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_CLI_installation.html))

```bash
sudo curl -Lo /usr/local/bin/ecs-cli https://amazon-ecs-cli.s3.amazonaws.com/ecs-cli-linux-amd64-latest
```

Using the Cluster Name outputted by successfully running the CDK template - run the following command:

```bash
ecs-cli ps --cluster YOUR_CLUSTER_NAME_GOES_HERE_CHANGEME
```

You will be presented with the public ip of your server as follows:

```bash
Name                                                                                                            State    Ports                                                                                     TaskDefinition                                            Health
ValheimServerAwsCdkStack-fargateCluster7F3D820B-AxbOSXn1ghAs/8d190269c9df4d3e9709dccb89bdf3d8/valheimContainer  RUNNING  1.1.1.1:2456->2456/udp, 1.1.1.1:2457->2457/udp, 1.1.1.1:2458->2458/udp  ValheimServerAwsCdkStackvalheimTaskDefinitionB5805DE1:17  UNKNOWN
```

Game server runs on port 2456 (unless changed)

#### Via the AWS Console: 
goto the ECS Service page (click the services dropdown and select ECS - or click [here](https://us-east-2.console.aws.amazon.com/ecs) if you are in us-east-2). From here - you will see a Cluster listed. Click the cluster name to continue to the details page.
![ECS Service Page](.img/Cluster.PNG)

At the bottom half of the screen - click the Tasks tab tab - you should see a "Task ID". Click the task id to continue to the next page.
![Cluster Information Page](.img/TaskTab.PNG)

Finally - the public IP of your server will be listed here - under the Network section. Connect to the server using the IP and port 2456!
![Task Information Page](.img/TaskInfo.PNG)

---

## To-Do

1. Add in via the CLI an ability to return your ServerIP if it is restarted.
2. Add in ability to auto-restart servers with a specified time.
