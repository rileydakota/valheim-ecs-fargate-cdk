# valheim-ecs-fargate-cdk
![this could be you!](giphy.gif)

This is a CDK Project for spinning up a [Valheim](https://store.steampowered.com/app/892970/Valheim/) game server on AWS Using [ECS Fargate](https://aws.amazon.com/fargate/?whats-new-cards.sort-by=item.additionalFields.postDateTime&whats-new-cards.sort-order=desc&fargate-blogs.sort-by=item.additionalFields.createdDate&fargate-blogs.sort-order=desc) and [Amazon EFS](https://aws.amazon.com/efs/)!

Uses [valheim-server-docker](https://github.com/lloesche/valheim-server-docker) - thanks to lloesche for putting it together!

## Installation/Deployment

Making the assumption you have an AWS Account Already and a valid set of creds configured:

1. Create a Secret named **valheimServerPass** in the same region you plan to deploy the CDK Stack - we reference it by name [here](lib/valheim-server-aws-cdk-stack.ts#L14-17) and pass that value to our container as a secret. valheim-server-docker requires this to be AT LEAST 5 characters (ideally much more).
2. Clone down our source code:
```
git clone git@github.com:rileydakota/valheim-ecs-fargate-cdk.git
```
3. Install depedencies:
```
npm i
```
4. Assuming you have already bootstrapped your account via the CDK (see [here](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) if not) - deploy the stack
```
npx cdk deploy
```
5. enjoy accidentally chopping trees onto your friends powered by AWS!


## Configuration

Coming soon

## Common Problems/FAQ

Coming soon

## To-Do

Coming soon
