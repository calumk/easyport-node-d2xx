let stringToUtf8Bytes = (text) => {
    return Uint8Array.from(Array.from(text).map(letter => letter.charCodeAt(0)));
}

let Utf8BytesToString = (bytes) => {
    // return String.fromCharCode(...bytes).replace(/[\n\r]+/g, '');
    // .trim() is more efficient than .replace(/[\n\r]+/g, '')
    return String.fromCharCode(...bytes).trim()
}

let toHex = (number) => {
    // This is a superlazy way to convert a number to a hex string, it also handles strings and booleans
    // if number is a string, convert it to a number
    if (typeof number === 'string') {
        number = parseInt(number);
    }
    // if number is a boolean, convert it to a number
    if( number === true || number === false ){
        number = number ? 1 : 0;
    }

    return number.toString(16);
}

let toDec = (number) => {
    // if number is a string, convert it to a number
    // unnecessary, as the string is already converted to a number by parseInt
   
    // if (typeof number === 'string') {
        number = parseInt(number, 16);
    // }
    return number.toString(10);
}

export { stringToUtf8Bytes, Utf8BytesToString, toHex, toDec };