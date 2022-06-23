# Adapter Machine Node JS

1. Ethernet IP
```js
const { Controller, Tag, EthernetIP } = require("ethernet-ip");
const { DINT, INT } = EthernetIP.CIP.DataTypes.Types;

const PLC = new Controller();
const myTag = new Tag("TestNodered"); // Controller Scope Tag
const cobaWrite = new Tag("BitNodered.0", null, INT); // Controller Scope Tag
PLC.subscribe(new Tag("TestNodered"));

PLC.connect("192.168.3.98", 1).then(async () => {
    // cobaWrite.value = 1;
    // await PLC.writeTag(cobaWrite);
    // await PLC.readTag(myTag);
    // console.log(myTag.value);
    // console.log(PLC.properties);
    const { name } = PLC.properties;
 
    // Log Connected to Console
    console.log(`\n\nConnected to PLC ${name}...\n`);
 
    // Begin Scanning Subscription Group
    PLC.scan();
});

PLC.forEach((tag: { on: (arg0: string, arg1: (tag: any, lastValue: any) => void) => void; }) => {
  tag.on("Changed", (tag: { name: any; value: any; }, lastValue: any) => {
      console.log(`${tag.name} changed from ${lastValue} -> ${tag.value}`);
  });
})
```


2. Modbus TCP
```js
// create an empty modbus client
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();

// open connection to a tcp line
client.connectTCP("192.168.3.98", { port: 502 });
client.setID(1);

// read the values of 10 registers starting at address 0
// on device number 1. and log the values to the console.
let i: number = 0;
setInterval(function() {
  client.writeRegisters(10, [0 , i++])
    .then((red: any) => {
      console.log(red)
    });
  // client.readHoldingRegisters(0, 100, function(err: any, data: { data: any; }) {
  //     console.log(data.data);
  // });
}, 500);
```