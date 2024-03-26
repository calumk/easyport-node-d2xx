
import { EasyPort } from "./src/index.js";

let easyport = new EasyPort({
    timeouts : {
        tx : 100,
        rx : 100
    }
});

await easyport.openDevice(0);

setTimeout(async () => {
    await easyport.write_output_byte({
        value : 9
    })
    
    let response = await easyport.read_input_byte();
    console.log(response);
}, 1000);

