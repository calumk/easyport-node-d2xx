# easyport-node-d2xx
Library for using EasyPort in Node.js

https://ip.festo-didactic.com/InfoPortal/MPS/EasyPort/EN/index.html

## Description
EasyPort is a GPIO device designed and manufactured by Festo Didactic, for connection to Festo Products using Syslink or Sub-D Connectors.



## Simple Use
This outlines simple use of the library

### Setup
```js
import { EasyPort } from "easyport-node-d2xx";

let easyport = new EasyPort({
    timeouts : {
        tx : 100,
        rx : 100
    }
});

// List all Devices
let devices = easyport.getDevices()
console.log(devices)

await easyport.openDevice(0);

```


### Reading Bits / Bytes / Words
```js
// Read A single Bit (defaults to 0)
let example1 = await easyport.read_input_bit()
console.log(example1);

// Read A single Bit (Bit 4)
let example2 = await easyport.read_input_bit({
  bit : 4
})
console.log(example2);


// Read A single Byte (defaults to 0) = (Port 0)
let example3 = await easyport.read_input_byte()
console.log(example3);

// Read A single Byte (Byte 1) =  (Port 1)
let example4 = await easyport.read_input_byte({
  byte : 1
})
console.log(example4);

// Read the input word (There are multiple, but only 1 worth reading because this is Port 1 + Port 2)
let respons3 = await easyport.read_input_word()
console.log(respons3);
```


###  Writing Bits / Bytes / Words 
```js
// Turn on the first bit
await easyport.write_output_bit({
  bit : 0
  value : 1
})

// Turn on Bits 1 + 2 + 3 = 7 (Binary)
await easyport.write_output_byte({
  byte : 0,
  value : 7
})

// Turn on all bits (Binary)
await easyport.write_output_byte({
  value : 65535
})
```


## Advanced Use [BETA]

It is possible to enable monitoring mode, this is useful if you **MAINLY** want to read data, very quickly. < (25ms)

In monitoring mode, if you want to "WRITE" data again, you currently need to stop the monitoring mode
This is to prevent data collision, as otherwise you can end up reading data from the monitor mode instead of the response to your own command.

To accomplish this, the library will automatically disable monitoring mode, and then re-enable it once the write is complete, but this means that it takes time (50ms) to switch modes. 
So if you want to read + write data fast - its probably easier to just do it cyclicly with a setInterval for now.

This is not very performant, and it is possible that it is unnessesary - more work to consider.


```js

// Enable the Monitoring Mode
easyport.enableMonitoringMode()

// disable Monitoring Mode
easyport.disableMonitoringMode()

// this will tell you when the monitoring mode has changed
// This is useful, because if you try to write data while monitoring mode is on, it will be automatically disabled, and then re-endabled.
easyport.registerNewMonitoringModeEnabledListener((data) => {
    console.log("Monitoring Mode: ", data)
});

// This will log all monitored data (the value of the whole word 0)
easyport.registerNewMonitoringModeListener((data) => {
    console.log(data)
});




## Requirements
* ftdi-d2xx

* 
