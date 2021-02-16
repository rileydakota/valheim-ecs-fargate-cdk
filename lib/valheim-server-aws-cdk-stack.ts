import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as secretsManager from '@aws-cdk/aws-secretsmanager'
import * as efs from '@aws-cdk/aws-efs';



export class ValheimServerAwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    //const steamCreds = secretsManager.Secret.fromSecretNameV2(this, 'predefinedSteamCreds', 'steamCreds')


    // MUST BE DEFINED BEFORE RUNNING CDK DEPLOY! Key Value should be: VALHEIM_SERVER_PASS
    const valheimServerPass = secretsManager.Secret.fromSecretNameV2(this, 'predefinedValheimServerPass', 'valheimServerPass')

    const elasticIp = new ec2.CfnEIP(this, 'valheimEIP')

    const vpc = new ec2.Vpc(this, 'valheimVpc', {
      cidr: '10.0.0.0/24',
      subnetConfiguration:[ {
        cidrMask: 24,
        name: 'valheimPublicSubnet',
        subnetType: ec2.SubnetType.PUBLIC
      }],
      maxAzs: 1
    })

    // vpc.addFlowLog('flowLogs', {
    //   destination: ec2.FlowLogDestination.toCloudWatchLogs
    // })
    const fargateCluster = new ecs.Cluster(this, 'fargateCluster', {vpc: vpc})

    const serverFileSystem = new efs.FileSystem(this, 'valheimServerStorage', {
      vpc: vpc,
      encrypted: true
    })

    

    const serverVolumeConfig: ecs.Volume = {
      name: "valheimServerVolume",
      efsVolumeConfiguration: {
        fileSystemId: serverFileSystem.fileSystemId
      }
    }

    const mountPoint : ecs.MountPoint = {
      containerPath : '/config',
      sourceVolume: serverVolumeConfig.name,
      readOnly: false
    }


    const valheimTaskDefinition = new ecs.TaskDefinition(this, 'valheimTaskDefinition', {
      compatibility: ecs.Compatibility.FARGATE,
      cpu: '2048',
      memoryMiB: '4096',
      volumes:[serverVolumeConfig],
      networkMode: ecs.NetworkMode.AWS_VPC
    })

    
    const container = valheimTaskDefinition.addContainer('valheimContainer', {
        image: ecs.ContainerImage.fromRegistry("lloesche/valheim-server"),
        //memoryLimitMiB: 4096,
        //cpu: 1024,
        //memoryReservationMiB: 4096,
        logging: ecs.LogDrivers.awsLogs({streamPrefix: 'ValheimServer'}),
        environment: {
          SERVER_NAME: 'TheBoyzGoPillaging',
          SERVER_PORT: '2456',
          WORLD_NAME: 'ValheimBoysWorld',
          SERVER_PUBLIC: '1',
          UPDATE_INTERVAL: '900',
          BACKUPS_INTERVAL: '3600',
          BACKUPS_DIRECTORY: '/config/backups',
          BACKUPS_MAX_AGE: '3',
          BACKUPS_DIRECTORY_PERMISSIONS: '755',
          BACKUPS_FILE_PERMISSIONS: '644',
          CONFIG_DIRECTORY_PERMISSIONS: '755',
          WORLDS_DIRECTORY_PERMISSIONS: '755',
          WORLDS_FILE_PERMISSIONS: '644',
          DNS_1: '10.0.0.2',
          DNS_2: '10.0.0.2',
          STEAMCMD_ARGS: 'validate',
          //SERVER_PASS: 'supersecure'
        },
        secrets: {
         SERVER_PASS: ecs.Secret.fromSecretsManager(valheimServerPass, 'VALHEIM_SERVER_PASS')
        }
    })

    container.addPortMappings({
      containerPort: 2456,
      hostPort: 2456,
      protocol: ecs.Protocol.UDP
    }, {
      containerPort:  2457,
      hostPort: 2457,
      protocol: ecs.Protocol.UDP
    },
    {
      containerPort:  2458,
      hostPort: 2458,
      protocol: ecs.Protocol.UDP
    }
    );
    

    container.addMountPoints(mountPoint)

    const valheimService = new ecs.FargateService(this, 'valheimService', {
      cluster: fargateCluster,
      taskDefinition: valheimTaskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4
    })

    serverFileSystem.connections.allowDefaultPortFrom(valheimService)
    valheimService.connections.allowFromAnyIpv4(new ec2.Port(
      {
        protocol: ec2.Protocol.UDP, 
        stringRepresentation: 'valheimPorts',
        fromPort: 2456,
        toPort: 2458
      }))

    //const valheimServerUserData =  ec2.UserData.forLinux({})

    // valheimServerUserData.addCommands(
    //   'useradd -m steam',
    //   'sudo yum install steamcmd',
    //   'ln -s /usr/games/steamcmd steamcmd',
    // )

  //   const instance = new ec2.Instance(this, 'valheimServerInstance', {
  //     vpc: vpc,
  //     instanceType: new ec2.InstanceType('c4.xlarge'),
  //     machineImage: ec2.MachineImage.latestAmazonLinux(),
  //     userData: ec2.UserData()
  //   })
  }
}
