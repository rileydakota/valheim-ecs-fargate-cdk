import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Port, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, Compatibility, ContainerImage, FargatePlatformVersion, FargateService, LogDrivers, MountPoint, NetworkMode, Protocol, Secret, TaskDefinition, Volume } from "aws-cdk-lib/aws-ecs";
import { FileSystem } from "aws-cdk-lib/aws-efs";
import { Secret as SecretsManagerSecret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class ValheimServerAwsCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // MUST BE DEFINED BEFORE RUNNING CDK DEPLOY! Key Value should be: VALHEIM_SERVER_PASS
    const valheimServerPass = SecretsManagerSecret.fromSecretNameV2(
      this,
      "predefinedValheimServerPass",
      "valheimServerPass"
    );

    const vpc = new Vpc(this, "valheimVpc", {
      cidr: "10.0.0.0/24",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "valheimPublicSubnet",
          subnetType: SubnetType.PUBLIC,
        },
      ],
      maxAzs: 1,
    });
    const fargateCluster = new Cluster(this, "fargateCluster", {
      vpc: vpc,
    });

    const serverFileSystem = new FileSystem(this, "valheimServerStorage", {
      vpc: vpc,
      encrypted: true,
    });

    const serverVolumeConfig: Volume = {
      name: "valheimServerVolume",
      efsVolumeConfiguration: {
        fileSystemId: serverFileSystem.fileSystemId,
      },
    };

    const mountPoint: MountPoint = {
      containerPath: "/config",
      sourceVolume: serverVolumeConfig.name,
      readOnly: false,
    };

    const valheimTaskDefinition = new TaskDefinition(
      this,
      "valheimTaskDefinition",
      {
        compatibility: Compatibility.FARGATE,
        cpu: "2048",
        memoryMiB: "4096",
        volumes: [],
        networkMode: NetworkMode.AWS_VPC,
      }
    );

    const container = valheimTaskDefinition.addContainer("valheimContainer", {
      image: ContainerImage.fromRegistry("lloesche/valheim-server"),
      logging: LogDrivers.awsLogs({ streamPrefix: "ValheimServer" }),
      environment: {
        SERVER_NAME: "VALHEIM-SERVER-AWS-ECS",
        SERVER_PORT: "2456",
        WORLD_NAME: "VALHEIM-WORLD-FILE",
        SERVER_PUBLIC: "1",
        UPDATE_INTERVAL: "900",
        BACKUPS_INTERVAL: "3600",
        BACKUPS_DIRECTORY: "/config/backups",
        BACKUPS_MAX_AGE: "3",
        BACKUPS_DIRECTORY_PERMISSIONS: "755",
        BACKUPS_FILE_PERMISSIONS: "644",
        CONFIG_DIRECTORY_PERMISSIONS: "755",
        WORLDS_DIRECTORY_PERMISSIONS: "755",
        WORLDS_FILE_PERMISSIONS: "644",
        DNS_1: "10.0.0.2",
        DNS_2: "10.0.0.2",
        STEAMCMD_ARGS: "validate",
      },
      secrets: {
        SERVER_PASS: Secret.fromSecretsManager(
          valheimServerPass,
          "VALHEIM_SERVER_PASS"
        ),
      },
    });

    container.addPortMappings(
      {
        containerPort: 2456,
        hostPort: 2456,
        protocol: Protocol.UDP,
      },
      {
        containerPort: 2457,
        hostPort: 2457,
        protocol: Protocol.UDP,
      },
      {
        containerPort: 2458,
        hostPort: 2458,
        protocol: Protocol.UDP,
      }
    );

    container.addMountPoints(mountPoint);

    const valheimService = new FargateService(this, "valheimService", {
      cluster: fargateCluster,
      taskDefinition: valheimTaskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      platformVersion: FargatePlatformVersion.VERSION1_4,
    });

    serverFileSystem.connections.allowDefaultPortFrom(valheimService);
    valheimService.connections.allowFromAnyIpv4(
      new Port({
        protocol: Protocol.UDP,
        stringRepresentation: "valheimPorts",
        fromPort: 2456,
        toPort: 2458,
      })
    );

    new CfnOutput(this, "serviceName", {
      value: valheimService.serviceName,
      exportName: "fargateServiceName",
    });

    new CfnOutput(this, "clusterArn", {
      value: fargateCluster.clusterName,
      exportName:"fargateClusterName"
    });

    new CfnOutput(this, "EFSId", {
      value: serverFileSystem.fileSystemId
    })
  }
}
