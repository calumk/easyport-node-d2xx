// EasyPort class for Node.js
// Relies on FTDI D2XX drivers for communication
// This class is a simple class that allows for EasyPort Communication in node.js.
import {
	toHex,
	toDec,
	stringToUtf8Bytes,
	Utf8BytesToString,
} from "./helpers_string.js";

// import { createRequire } from "node:module";
// const _require = createRequire(import.meta.url);
// let FTDI = _require("./ftdi-d2xx.node"); // Try loading the Debug build, if any

import FTDI from 'ftdi-d2xx';

class EasyPort {
	constructor(_options = {}) {
        this._options = {}
        Object.assign(this._options, {
            timeouts: {
				tx: 1000,
				rx: 1000,
			},
			baudRate: 115200,
			dataCharacteristics: {
				bits: FTDI.FT_BITS_8,
				stopBits: FTDI.FT_STOP_BITS_1,
				parity: FTDI.FT_PARITY_NONE,
			},
        }, _options);
	

		// This is the device that will be used to communicate with the EasyPort
		this.device = null;


        this._monitoringModeEnabled = false;
        this.reEnableMonitoringMode = false;
        this.monitoringModeInterval = null;
        this.monitoringModeListener = (value) => {},
        this.registerNewMonitoringModeListener = (listener) => {
            this.monitoringModeListener = listener;
        },
        this.monitoringModeEnabledListener = (value) => {},
        this.registerNewMonitoringModeEnabledListener = (listener) => {
            this.monitoringModeEnabledListener = listener;
        },

        this.temp = null;


        this.inputlog = [];
        this.outputlog = [];

        // Trigger the init function
		this.init();
	}

    set monitoringModeEnabled(value){
        this._monitoringModeEnabled = value;
        this.monitoringModeEnabledListener(this._monitoringModeEnabled);
    }
    get monitoringModeEnabled(){
        return this._monitoringModeEnabled;
    }

	init = async () => {
        // Set the VID and PID of the device
		FTDI.setVIDPID(0x0403, 0xaf80);
        // await this.disableMonitoringMode();
	};

	getDevices = async () => {
		const devices = await FTDI.getDeviceInfoList();
		return devices;
	};

	openDevice = async (i = 0) => {
		const devices = await FTDI.getDeviceInfoList();
		this.device = await FTDI.openDevice(devices[i]);
        console.log(`Device open: ${this.device}`);

		this.device.setTimeouts(
			this._options.timeouts.tx,
			this._options.timeouts.rx
		); // set the max TX and RX duration in ms
		this.device.setBaudRate(this._options.baudRate); // set the UART baud rate (bits per second)
		await this.device.purge(FTDI.FT_PURGE_RX); // purge the RX buffer from previous received data

		this.device.setDataCharacteristics(
			this._options.dataCharacteristics.bits,
			this._options.dataCharacteristics.stopBits,
			this._options.dataCharacteristics.parity
		);

        // await this.disableMonitoringMode();
        return this.device;
	};


    enableMonitoringMode = async () => {
        this.monitoringModeEnabled = true;
        this.reEnableMonitoringMode = true;
        // console.log("Monitoring Mode Enabled")
        await this.writeString("MT1=10")
        let resp = await this.readString(5)
        // console.log("EMM: ", resp);
        await this.device.purge(FTDI.FT_PURGE_RX);
        this.monitoringModeInterval = setInterval(async () => {
            let response = await this.readString();
            if(response.length > 0 && this.monitoringModeEnabled){ // catch if disabled
                this.temp = toDec(response.slice(-4))
                this.monitoringModeListener(this.temp);
            }
        }, 50)
    }       
    disableMonitoringMode = async () => {
        this.monitoringModeEnabled = false;
        this.reEnableMonitoringMode = false;
        // console.log("Monitoring Mode Disabled")
        clearInterval(this.monitoringModeInterval)
        // this.device.purge(FTDI.FT_PURGE_RX);
        await this.writeString("MT1=00")
        let resp = await this.readString(5)
        // console.log("DMM: ", resp);
        await this.device.purge(FTDI.FT_PURGE_RX); // purge the RX buffer from previous received data
    }
    pauseMonitoringMode = async () => {
        this.monitoringModeEnabled = false;
        this.reEnableMonitoringMode = true;
        // console.log("Monitoring Mode Paused")
        clearInterval(this.monitoringModeInterval)
        // this.device.purge(FTDI.FT_PURGE_RX);
        await this.writeString("MT1=00")
        let resp = await this.readString(5)
        // console.log("PMM: ", resp);
        await this.device.purge(FTDI.FT_PURGE_RX);
    }





    // @name : writeString
    // @description : Write a string to the easyport
    // @input : string - the string to write
    // @output : void
	writeString = async (string) => {
		let data = stringToUtf8Bytes(string + "\r");
        this.outputlog.push(data);
		await this.device.purge(FTDI.FT_PURGE_RX);
		await this.device.write(data);
        // Sleep for 10ms to allow the device to process the data
        // await new Promise(resolve => setTimeout(resolve, 10));
	};

    // @name : readString
    // @description : Read a string from the easyport
    // @input : length - the length of the string to read, defaults to 100, but will also timeout after the timeout set in the options
    // @output : string - the string read from the easyport
	readString = async (length = 100) => {
		const response = await this.device.read(length);
        await this.device.purge(FTDI.FT_PURGE_RX);
		let resp = Utf8BytesToString(response);
        this.inputlog.push(resp);
        return resp
	};



    read_input_bit = async (_options) => {
        const options = Object.assign({ easyport : 1, word : 0, bit : 0 }, _options);

        let wrap = await this.wrapMonitoringMode(options, async (options) => {

            let string = `DE${options.easyport}.${options.word}.${toHex(options.bit)}`; // The bit is in HEX! (Technically everything is in HEX)
            await this.writeString(string);

            // length is 1 more, because =X is added to the response, but 'D' is not in the response
            // eg DE1.1.1 => E1.1.1=X

            let response = await this.readString(string.length+1); // HEX so 2 digits? 
            let hex = response.split('=')[1]
            let dec = parseInt(hex, 16)
            console.log("response: ", response) 


            return dec
        });
        return wrap   
    }


    read_input_byte = async (_options) => {
        const options = Object.assign({ easyport : 1, word : 0, byte : 0 }, _options);
        let wrap = await this.wrapMonitoringMode(options, async (options) => {
            let string = `DEB${options.easyport}.${options.word}.${options.byte}`;
            await this.writeString(string);
            console.log("string DEB: ", string)
        
            // length is 2 more, because =XX is added to the response, but 'D' is not in the response
            // eg DEB1.1.1 => EB1.1.1=XX
            let response = await this.readString(string.length+2); // HEX so 2 digits? 
            let hex = response.split('=')[1]
            let dec = parseInt(hex, 16)
            console.log("response: ", response) 
            return dec
        });
        return wrap   
    }

    read_input_word = async (_options) => {
        const options = Object.assign({ easyport : 1, word : 0}, _options);
        let wrap = await this.wrapMonitoringMode(options, async (options) => {
            let string = `DEW${options.easyport}.${options.word}`;
            await this.writeString(string);
        
            // length is 3 more, because =XXX is added to the response, but 'D' is not in the response
            // eg DEW1.1 => EW1.1=XXX
            let response = await this.readString(); // HEX so 3 digits? 
            console.log("responses : " ,response)
            let hex = response.split('=')[1]
            let dec = parseInt(hex, 16)
            return dec
        });
        return wrap   
    }



	// @name : write_output_bit
	// @description : Modify a bit in the easyport
    // @params : options - an object containing the following properties
    // - @params : easyport (defaults to 1) - the easyport number
    // - @params : word - the word number
    // - @params : bit - the bit number
    // - @params : value - the value to write - in 0 or 1
    // - @params : dirty (defaults to false) - if true, the function will not check the response
	// @output : Boolean - true if the bit was modified successfully, false otherwise
	write_output_bit = async (_options) => {
		const options = Object.assign({ easyport : 1, word : 0, bit : 0, value : 0, dirty : false}, _options);

        let wrap = await this.wrapMonitoringMode(options, async (options) => {

                let string = `MA${options.easyport}.${options.word}.${toHex(options.bit)}=${value}`;
                await this.writeString(string);

                if (options.dirty) return true;

                let response = await this.readString(string.length - 1);
                try{
                    return (toDec(response.split("=")[1].toString()) == options.value) ? true : false
                }catch(error){
                    return false
                }
            });
            return wrap
        };

    // @name : write_output_byte
    // @description : Modify a byte in the easyport
    // @params : device - the device object
    // @params : options - an object containing the following properties
    // - @params : easyport (defaults to 1) - the easyport number
    // - @params : word - the word number
    // - @params : byte - the byte number
    // - @params : value - the value to write - in decimal
    // - @params : dirty (defaults to false) - if true, the function will not check the response
    // @output : Boolean - true if the byte was modified successfully, false otherwise
	write_output_byte = async (_options) => {
        const options = Object.assign({ easyport : 1, word : 0, byte : 0, value : 0, dirty : false}, _options);

        let wrap = await this.wrapMonitoringMode(options, async (options) => {

            let string = `MAB${options.easyport}.${options.word}.${options.byte}=${toHex(options.value)}`;
            // console.log(await this.readString());
            await this.writeString(string);
            // console.log(await this.readString());
            // console.log(`Data sent: ${options.value}(dec) => ${toHex(options.value)}(hex) => ${string}`);

            // this is needed to get the response from the device, otherwise the next command will not work
            // The response length shoyld be 1 charecter smaller than the string sent ? eg MAB1.1.1=0 => AB1.1.1=0
            if (options.dirty) return true;
            let response =  await this.readString(string.length - 1);
            try{
                return (toDec(response.split("=")[1].toString()) == options.value) ? true : false
            }catch(error){
                return false
            }
        });
        return wrap
	};

    write_output_word = async (_options) => {
        const options = Object.assign({ easyport : 1, word : 0, value : 0, dirty : false}, _options);

        let wrap = await this.wrapMonitoringMode(options, async (options) => {
            
            let string = `MAW${options.easyport}.${options.word}=${toHex(options.value)}`;
            await this.writeString(string);
            // console.log(`Data sent: ${value}(dec) => ${toHex(value)}(hex) => ${string}`);
        
            // this is needed to get the response from the device, otherwise the next command will not work
            // The response length shoyld be 1 charecter smaller than the string sent ? eg MAW1.0=0 => AB1.1.1=0
            if (options.dirty) return true;
        
            let response = await this.readString();
            console.log("string MAW: ", string)
            console.log("response MAW: ", response)
            try{
                return (toDec(response.split("=")[1].toString()) == options.value) ? true : false
            }catch(error){
                return false
            }
        });
        return wrap
    };


    wrapMonitoringMode = async (options, func) => {
        try {
            if (this.monitoringModeEnabled) await this.pauseMonitoringMode();
            let resp = await func(options);
            if (this.reEnableMonitoringMode && !this.monitoringModeEnabled) await this.enableMonitoringMode();
            return resp
        } catch (error) {
            console.error("OHHHH NOOOOOO");
            console.error(error);
            console.log(this.inputlog);
            console.log(this.outputlog);
            return false;
        }
    }




    // Alias 
    // The Documentation uses the terms "display" and "modify" instead of "read" and "write", respectively
    // This is probably because if some german translation - so we will expose both possibilities
    // Alias for read_bit
    display_input_bit = async (options) => { await this.read_input_bit(options) }
    // Alias for read_byte
    display_input_byte = async (options) => { await this.read_input_byte(options) }
    // Alias for read_word
    display_input_word = async (options) => { await this.read_input_word(options) }
    // Alias for write_bit
    modify_output_bit = async (options) => { await this.write_output_bit(options) }
    // Alias for write_byte
    modify_output_byte = async (options) => { await this.write_output_byte(options) }
    // Alias for write_word
    modify_output_word = async (options) => { await this.write_output_word(options) }
    
}

export { EasyPort };
