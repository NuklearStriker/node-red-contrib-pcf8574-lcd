
// Credit: Adapted from https://wiki.dfrobot.com/I2C_TWI_LCD1602_Module__Gadgeteer_Compatible___SKU__DFR0063_ by https://www.dfrobot.com/
//         Adapted from https://github.com/edreanernst/node-red-contrib-pcf8574-lcd by https://github.com/edreanernst
//         Adapted too from https://github.com/wilberforce/lcd-pcf8574 by https://github.com/wilberforce

var sleep = require('sleep');

var displayPorts = {
    //# commands
    CLEARDISPLAY : 0x01,
    RETURNHOME : 0x02,
    ENTRYMODESET : 0x04,
    DISPLAYCONTROL : 0x08,
    CURSORSHIFT : 0x10,
    FUNCTIONSET : 0x20,
    SETCGRAMADDR : 0x40,
    SETDDRAMADDR : 0x80,

    //# flags for display entry mode
    ENTRYRIGHT : 0x00,
    ENTRYLEFT : 0x02,
    ENTRYSHIFTINCREMENT : 0x01,
    ENTRYSHIFTDECREMENT : 0x00,

    //# flags for display on/off control
    DISPLAYON : 0x04,
    DISPLAYOFF : 0x00,
    CURSORON : 0x02,
    CURSOROFF : 0x00,
    BLINKON : 0x01,
    BLINKOFF : 0x00,

    //# flags for display/cursor shift
    DISPLAYMOVE : 0x08,
    CURSORMOVE : 0x00,
    MOVERIGHT : 0x04,
    MOVELEFT : 0x00,

    //# flags for function set
    _8BITMODE : 0x10,
    _4BITMODE : 0x00,
    _2LINE : 0x08,
    _1LINE : 0x00,
    _5x10DOTS : 0x04,
    _5x8DOTS : 0x00,

    //# flags for backlight control
    BACKLIGHT : 0x08,
    NOBACKLIGHT : 0x00,

    //# LCD command
    EN : 0x04, // Enable bit
    RW : 0x02, // Read/Write bit
    RS : 0x01, // Register select bit
    CMD : 0x00 // Command mode
}

class LCD {
    constructor(address) {
        this.i2c = require('i2c-bus').openSync(1); //Create the I2C object
        this.addr = address; // Set LCD I2C address
        this._init(); 
    }
	
    /** init the internal value */
    _init(){
        /** Set the default configuration of the screen */
        this.screenConf = {
            backlight : displayPorts.NOBACKLIGHT, //BACKLIGHTOFF
            entrySide : displayPorts.ENTRYLEFT, //ENTRYLEFT
            entryShift : displayPorts.ENTRYSHIFTDECREMENT, //ENTRYSHIFTDECREMENT
            blink : displayPorts.BLINKON, //BLINKON
            cursor : displayPorts.CURSORON, //CURSORON
            display : displayPorts.DISPLAYON, //DISPLAYON
            dataLength : displayPorts._4BITMODE, //4BITSMODE
            nbLine : displayPorts._2LINE, //2LINE
            font : displayPorts._5x10DOTS //5x10DOTS
        }

        /** Then send it */
        this._sendConf();
    }

    /** Send the configuration to the screen */
    _sendConf(){
        /** Start initialization : RS and R/W need to be pulled low */
        this._sleep(50);
        this.writei2c(displayPorts.CMD);
        this._sleep(1000);

        /** switch from 8bits mode to 4bits mode */
        this.write4(0x30); // 1st try
        this._sleep(4500);
        this.write4(0x30); // 2nd try
        this._sleep(4500);
        this.write4(0x30); // 3rd try
        this._sleep(150);
        this.write4(0x20); // Finnaly set 4bits mode
        this.screenConf.backlight = displayPorts.BACKLIGHT;
        this.writeFunctionSet(); // Function set
        this._sleep(50);
        this.writeDisplayControl(); // Display control
        this._sleep(50);
        this.writeEntrySet(); // Entry set
        this._sleep(50);
        this.clear(); // LCD clear
	    this.home(); // Home
        return this;
    }
	
	/** sleep in microseconds */
    _sleep(micro) {
        sleep.usleep(micro);
    }

    /** Change i2c address of the screen */
    changei2caddr(address){
        this.addr = address; // set the address
        this._sendConf(); // send the conf
    }
	
    /** write on i2c port */
    writei2c(data) {
        this.i2c.sendByteSync(this.addr, data | this.screenConf.backlight);
	    this._sleep(10);
    }
	
    /** send a pulse on Enable */
    _pulseEnable(data) {
	    this.writei2c(data | displayPorts.EN); // Enable high
	    this._sleep(10);
		
	    this.writei2c(data); // Enable low
	    this._sleep(500);
    }
	
    /** write by 4bit */
    write4(data) {
        this.writei2c(data);
        this._pulseEnable(data);
    }
	
    /** write byte */
    write(data, c) {
	    var msb = data & 0xF0;
	    var lsb = (data << 4) & 0xF0;
        this.write4( msb | c);
        this.write4( lsb | c);
        return this;
    }
	
    writeFunctionSet(){
	    var _FunctionSet = (displayPorts.FUNCTIONSET | this.screenConf.dataLength | this.screenConf.nbLine | this.screenConf.font);
	    return this.write(_FunctionSet, displayPorts.CMD);
    }
	
    writeDisplayControl(){
	    var _DisplayControl = (displayPorts.DISPLAYCONTROL | this.screenConf.display | this.screenConf.cursor | this.screenConf.blink);
	    return this.write(_DisplayControl, displayPorts.CMD);
    }
	
    writeEntrySet(){
	    var _EntrySet = (displayPorts.ENTRYMODESET | this.screenConf.entrySide | this.screenConf.entryShift);
	    return this.write(_EntrySet, displayPorts.CMD);
    }
	
    /** clear display */
    clear() {
        return this.write(displayPorts.CLEARDISPLAY, displayPorts.CMD);
    }
	
    /** set cursor to 0,0 */
    home() {
        return this.write(displayPorts.RETURNHOME, displayPorts.CMD);
	    this._sleep(2000);
    }
	
    /** Print string */
    print(str) {
        if (typeof str == 'string') {
            for (var i = 0; i < str.length; i++) {
                var c = str[i].charCodeAt(0);
                this.write(c, displayPorts.RS);
                this._sleep(500);
            }
        }
        return this;
    }

	
    /** set cursor pos, top left = 0,0 */
    setCursor(column, line) {
        var offset = [0x00, 0x40, 0x14, 0x54];
        return this.write(displayPorts.SETDDRAMADDR | (offset[line] + column), displayPorts.CMD);
    }
	
    /** Turn blink of cursor off */
    blinkOff() {
	    this.screenConf.blink = displayPorts.BLINKOFF;
        return this.writeDisplayControl();
    }
	
    /** Turn blink of cursor on */
    blinkOn() {
        this.screenConf.blink = displayPorts.BLINKON;
        return this.writeDisplayControl();
    }
	
    /** Turn cursor off */
    cursorOff() {
        this.screenConf.cursor = displayPorts.CURSOROFF;
        return this.writeDisplayControl();
    }
	
    /** Turn cursor on */
    cursorOn() {
        this.screenConf.cursor = displayPorts.CURSORON;
        return this.writeDisplayControl();
    }
	
    /** Turn backlight off */
    backlightOff() {
        this.screenConf.backlight = displayPorts.NOBACKLIGHT;
        return writei2c(0);
    }
	
    /** Turn backlight on */
    backlightOn() {
        this.screenConf.backlight = displayPorts.BACKLIGHT;
        return writei2c(0);
    }
	
    /** Turn display off */
    off() {
        this.screenConf.backlight = displayPorts.NOBACKLIGHT;
	    this.screenConf.display = displayPorts.DISPLAYOFF;
        return this.writeDisplayControl();
    }
	
    /** Turn display on */
    on() {
        this.screenConf.backlight = displayPorts.BACKLIGHT;
	    this.screenConf.display = displayPorts.DISPLAYON;
        return this.writeDisplayControl();
    }
	
    /** set special character 0..7, data is an array(8) of bytes, and then return to home addr */
    createChar(ch, data) {
        this.write(displayPorts.SETCGRAMADDR | ((ch & 7) << 3), displayPorts.CMD);
        for (var i = 0; i < 8; i++)
            this.write(data[i], displayPorts.CHR);
        return this.write(displayPorts.SETDDRAMADDR, displayPorts.CMD);
    }

    isAlive() {
        var deviceArray = this.i2c.scanSync(this.addr);
        return (deviceArray.length > 0);
    }
}

module.exports = LCD;
