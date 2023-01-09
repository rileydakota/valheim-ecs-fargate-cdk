import { Annotations, CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Port, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, Compatibility, ContainerImage, FargatePlatformVersion, FargateService, LogDrivers, MountPoint, NetworkMode, Protocol, Secret, TaskDefinition, Volume } from "aws-cdk-lib/aws-ecs";
import { FileSystem } from "aws-cdk-lib/aws-efs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Secret as SecretsManagerSecret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface ValheimServerAwsCdkStackProps extends StackProps {

  /**
   * Optional parameter if you want to have the server start with an existing world file.
   */
  worldBootstrapLocation?: string;

  /**
   * The S3 bucket the world file exists in.
   * REQURED if worldBootstrapLocation is set.
   */
  worldResourcesBucket?: Bucket;
}

const ACTUAL_VALHEIM_WORLD_LOCATION = "/config/";

export class ValheimServerAwsCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: ValheimServerAwsCdkStackProps) {
    super(scope, id, props);

    if (props && props.worldBootstrapLocation && !props.worldResourcesBucket) {
      Annotations.of(this).addError("worldResourcesBucket must be set if worldBootstrapLocation is set!");
    }

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
      enableDnsSupport: true,
      enableDnsHostnames: true,
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
        volumes: [serverVolumeConfig],
        networkMode: NetworkMode.AWS_VPC,
      }
    );

    if (props && props.worldResourcesBucket) {
      props.worldResourcesBucket.grantRead(valheimTaskDefinition.taskRole);
    }

    // Valheim server environment variables
    // https://github.com/lloesche/valheim-server-docker#environment-variables
    const environment: Record<string, string> = Object.entries(process.env)
      .filter(([key]) => key.startsWith("VALHEIM_DOCKER_"))
      .reduce((a, [k, v]) => ({ ...a, [k.replace("VALHEIM_DOCKER_", "")]: v}), {});

    if (props && props.worldResourcesBucket) {
      environment["PRE_SUPERVISOR_HOOK"] = "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install awscli";

      // TODO: Make this smarter. Eg, check BOOTSTRAP_WITH_WORLD_NAME and see if *that* world file already exsts. Or give an option to not overwrite with the data from S3. 
      environment["PRE_START_HOOK"] = 
        `if [[ ! -d /config/worlds_local/ ]]; then aws s3 cp --recursive s3://${props.worldResourcesBucket.bucketName}/ ${ACTUAL_VALHEIM_WORLD_LOCATION}; else echo "Skipping copy from S3 because /config/worlds_local/ already exists"; fi`;

      Annotations.of(this).addInfo("World bootstrapping is configured, if the EFS file system already has a /config/worlds_local/ folder, then we will NOT bootstrap. This is to prevent overrwriting with the original bootstrap if the container restarts.");
    }

    const container = valheimTaskDefinition.addContainer("valheimContainer", {
      image: ContainerImage.fromRegistry("lloesche/valheim-server"),
      logging: LogDrivers.awsLogs({ streamPrefix: "ValheimServer" }),
      environment,
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
      minHealthyPercent: 0,
      enableExecuteCommand: true,
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
  }
}
