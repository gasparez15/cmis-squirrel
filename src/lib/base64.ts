export default class Base64 {

    private static chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    public static atob(input: string): string {
        let str = String(input).replace(/[=]+$/, ''); // #31: ExtendScript bad parse of /=
        if (str.length % 4 == 1) {
            throw new console.error("'atob' failed: The string to be decoded is not correctly encoded.");
        }
        let output = '';
        for (
            // initialize result and counters
            let bc = 0, bs, buffer, idx = 0;
            // get next character
            buffer = str.charAt(idx++);
            // character found in table? initialize bit storage and add its ascii value;
            ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
                // and if not first of each 4 characters,
                // convert the first 8 bits to one ascii character
                bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
        ) {
            // try to find character in table (0-63, not found => -1)
            buffer = Base64.chars.indexOf(buffer);
        }
        // return input;
        return output;
    };

    public static btoa(input: string): string {
        let str = String(input);
        let output = '';
        for (
            // initialize result and counter
            let block, charCode, idx = 0, map = Base64.chars;
            // if the next str index does not exist:
            // change the mapping table to "="
            // check if d has no fractional digits
            str.charAt(idx | 0) || (map = '=', idx % 1);
            // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
            output += map.charAt(63 & block >> 8 - idx % 1 * 8)
        ) {
            charCode = str.charCodeAt(idx += 3 / 4);
            if (charCode > 0xFF) {
                console.error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
            }
            block = block << 8 | charCode;
        }
        return output;
    };
}
