//############################################################ EthernetIP ################################################################
// const { Controller, Tag, EthernetIP } = require("ethernet-ip");
// const { DINT, INT } = EthernetIP.CIP.DataTypes.Types;

// const PLC = new Controller();
// const myTag = new Tag("TestNodered"); // Controller Scope Tag
// const cobaWrite = new Tag("BitNodered.0", null, INT); // Controller Scope Tag
// PLC.subscribe(new Tag("TestNodered"));

// PLC.connect("192.168.3.98", 1).then(async () => {
//     // cobaWrite.value = 1;
//     // await PLC.writeTag(cobaWrite);
//     // await PLC.readTag(myTag);
//     // console.log(myTag.value);
//     // console.log(PLC.properties);
//     const { name } = PLC.properties;
 
//     // Log Connected to Console
//     console.log(`\n\nConnected to PLC ${name}...\n`);
 
//     // Begin Scanning Subscription Group
//     PLC.scan();
// });

// PLC.forEach((tag: { on: (arg0: string, arg1: (tag: any, lastValue: any) => void) => void; }) => {
//   tag.on("Changed", (tag: { name: any; value: any; }, lastValue: any) => {
//       console.log(`${tag.name} changed from ${lastValue} -> ${tag.value}`);
//   });
// })


//################################################################ MODBUS ################################################################
// // create an empty modbus client
// var ModbusRTU = require("modbus-serial");
// var client = new ModbusRTU();

// // open connection to a tcp line
// client.connectTCP("192.168.3.98", { port: 502 });
// client.setID(1);

// // read the values of 10 registers starting at address 0
// // on device number 1. and log the values to the console.
// let i: number = 0;
// setInterval(function() {
//   client.writeRegisters(10, [0 , i++])
//     .then((red: any) => {
//       console.log(red)
//     });
//   // client.readHoldingRegisters(0, 100, function(err: any, data: { data: any; }) {
//   //     console.log(data.data);
//   // });
// }, 500);

//################################################################ OPC UA ################################################################
// ------------------------> Running Server
// const { OPCUAServer } = require("node-opcua");
// (async () => {
//     const server = new OPCUAServer({});
//     await server.initialize();
//     await server.start();
// })();

import {
  resolveNodeId,
  AttributeIds,
  OPCUAClient,
  DataValue,
  BrowseResult,
  ReferenceDescription, 
  TimestampsToReturn, 
  StatusCode, 
  StatusCodes,
  DataType
} from "node-opcua";

const endpointUrl = "opc.tcp://opcuademo.sterfive.com:26543";
const nodeId = "ns=7;s=Scalar_Simulation_Double";

async function main() {

  try {

      const client = OPCUAClient.create({
          endpoint_must_exist: false,
          connectionStrategy: {
              maxRetry: 2,
              initialDelay: 2000,
              maxDelay: 10 * 1000
          }
      });
      client.on("backoff", () => console.log("retrying connection"));


      await client.connect(endpointUrl);

      const session = await client.createSession();

      const browseResult: BrowseResult = await session.browse("RootFolder") as BrowseResult;

      console.log(browseResult.references?.map((r: ReferenceDescription) => r.browseName.toString()).join("\n"));

      const dataValue = await session.read({ nodeId, attributeId: AttributeIds.Value });
      if (dataValue.statusCode !== StatusCodes.Good) {
          console.log("Could not read ", nodeId);
      }
      console.log(` temperature = ${dataValue.value.toString()}`);

      // step 5: install a subscription and monitored item
      const subscription = await  session.createSubscription2({
          requestedPublishingInterval: 1000,
          requestedLifetimeCount: 100,
          requestedMaxKeepAliveCount: 20,
          maxNotificationsPerPublish: 10,
          publishingEnabled: true,
          priority: 10
      });

      subscription
          .on("started", () => console.log("subscription started - subscriptionId=", subscription.subscriptionId))
          .on("keepalive", () => console.log("keepalive"))
          .on("terminated", () => console.log("subscription terminated"));

      const monitoredItem = await subscription.monitor({
          nodeId,
          attributeId: AttributeIds.Value
      },
          {
              samplingInterval: 100,
              discardOldest: true,
              queueSize: 10
          }, TimestampsToReturn.Both);


      monitoredItem.on("changed", (dataValue: DataValue) => {
          console.log(` Temperature = ${dataValue.value.value.toString()}`)
      });

      await new Promise((resolve) => setTimeout(resolve, 10000));
      await subscription.terminate();

      const statusCode =await session.write({
          nodeId: "ns=7;s=Scalar_Static_Double",
          attributeId: AttributeIds.Value,
          value: {
              statusCode: StatusCodes.Good,
              sourceTimestamp: new Date(),
              value: {
                  dataType: DataType.Double,
                  value: 25.0
              }
          }
      });
      console.log("statusCode = ", statusCode.toString());


      console.log(" closing session");
      await session.close();

      await client.disconnect();
  }
  catch (err) {
      console.log("Error !!!", err);
  }
}

main();