
// Credit: Adapted from https://wiki.dfrobot.com/I2C_TWI_LCD1602_Module__Gadgeteer_Compatible___SKU__DFR0063_ by https://www.dfrobot.com/
//         Adapted from https://github.com/edreanernst/node-red-contrib-pcf8574-lcd by https://github.com/edreanernst
//         Adapted too from https://github.com/wilberforce/lcd-pcf8574 by https://github.com/wilberforce

var sleep = require('sleep');

/** Configuration of the screen */
var displayPorts = {
	/* backlight */
	backlight : 0x08, //BACKLIGHTON
	
	/* Entry set */
	entrySide : 0x02, //ENTRYLEFT
	entryShift : 0x00, //ENTRYSHIFTDECREMENT
	
	/* Display control */
	blink : 0x01, //BLINKON
	cursor : 0x02, //CURSORON
	display : 0x04, //DISPLAYON
	
	/*Function set*/
	dataLength : 0x00, //4BITSMODE
	nbLine : 0x08, //2LINE
	font : 0x04 //5x10DOTS
};

class LCD {
    constructor(address) {
        this.i2c = require('i2c-bus').openSync(1);
        this.addr = address;
	
	this._init();
		
        this.write4(0x30 << 4); //initialization: 1st try
        this._sleep(4500);
        this.write4(0x30 << 4); //initialization: 2nd try
        this._sleep(4500);
        this.write4(0x30 << 4); //initialization: 3rd try
        this._sleep(150);
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
	
    /** init the internal value */
    _init(){
	displayPorts.entrySide = LCD.ENTRYLEFT;
	displayPorts.entryShift = LCD.ENTRYSHIFTDECREMENT;
	displayPorts.blink = LCD.BLINKON;
	displayPorts.cursor = LCD.CURSORON;
	displayPorts.display = LCD.DISPLAYON;
	displayPorts.dataLength = LCD._4BITMODE;
	displayPorts.nbLine = LCD._2LINE;
	displayPorts.font = LCD._5x10DOTS;
    }
	
	/** flashing block for the current cursor */
    _sleep(micro) {
        sleep.usleep(micro);
    }
	
    /** write on i2c port */
    writei2c(data) {
 	this.i2c.sendByteSync(this.addr, data | displayPorts.backlight);
    }
	
    /** send a pulse on Enable */
    _pulseEnable(data) {
	this.writei2c(data | LCD._Enable); // Enable high
	this._sleep(1);
		
	this.writei2c(data); // Enable low
	this._sleep(50);
    }
	
    /** write by 4bit */
    write4(data) {
        this.writei2c(data);
        this._pulseEnable(data);
    }
	
    /** write byte */
    write(data, c) {
	var highnib = data & 0xF0;
	var lownib = (data << 4) & 0xF0;
        this.write4( highnib | c);
        this.write4( lownib | c);
        return this;
    }
	
    writeFunctionSet(){
	var _FunctionSet = (LCD.FUNCTIONSET | displayPorts.dataLength | displayPorts.nbLine | displayPorts.font);
	return this.write(_FunctionSet, LCD.CMD);
    }
	
    writeDisplayControl(){
	var _DisplayControl = (LCD.DISPLAYCONTROL | displayPorts.display | displayPorts.cursor | displayPorts.blink);
	return this.write(_DisplayControl, LCD.CMD);
    }
	
    writeEntrySet(){
	var _EntrySet = (LCD.ENTRYMODESET | displayPorts.entrySide | displayPorts.entryShift);
	return this.write(_EntrySet, LCD.CMD);
    }
	
    /** clear display */
    clear() {
        return this.write(LCD.CLEARDISPLAY, LCD.CMD);
    }
	
    /** Print string */
    print(str) {
        if (typeof str == 'string') {
            for (var i = 0; i < str.length; i++) {
                var c = str[i].charCodeAt(0);
                this.write(c, LCD.RS);
                //this._sleep(100);
            }
        }
        return this;
    }
	
    /** set cursor pos, top left = 0,0 */
    setCursor(column, line) {
        var offset = [0x00, 0x40, 0x14, 0x54];
        return this.write(LCD.SETDDRAMADDR | (offset[line] + column), LCD.CMD);
    }
	
    /** set cursor to 0,0 */
    home() {
        return this.write(LCD.RETURNHOME, LCD.CMD);
	//this._sleep(2000);
    }
	
    /** Turn blink of cursor off */
    blinkOff() {
	displayPorts.blink = LCD.BLINKOFF;
        return this.writeDisplayControl();
    }
	
    /** Turn blink of cursor on */
    blinkOn() {
        displayPorts.blink = LCD.BLINKON;
        return this.writeDisplayControl();
    }
	
    /** Turn cursor off */
    cursorOff() {
        displayPorts.cursor = LCD.CURSOROFF;
        return this.writeDisplayControl();
    }
	
    /** Turn cursor on */
    cursorOn() {
        displayPorts.cursor = LCD.CURSORON;
        return this.writeDisplayControl();
    }
	
    /** Turn backlight off */
    backlightOff() {
        displayPorts.backlight = LCD.NOBACKLIGHT;
        return writei2c(0);
    }
	
    /** Turn backlight on */
    backlightOn() {
        displayPorts.backlight = LCD.BACKLIGHT;
        return writei2c(0);
    }
	
    /** Turn display off */
    off() {
        displayPorts.backlight = LCD.NOBACKLIGHT;
	displayPorts.display = LCD.DISPLAYOFF;
        return this.writeDisplayControl();
    }
	
    /** Turn display on */
    on() {
        displayPorts.backlight = LCD.BACKLIGHT;
	displayPorts.display = LCD.DISPLAYON;
        return this.writeDisplayControl();
    }
	
    /** set special character 0..7, data is an array(8) of bytes, and then return to home addr */
    createChar(ch, data) {
        this.write(LCD.SETCGRAMADDR | ((ch & 7) << 3), LCD.CMD);
        for (var i = 0; i < 8; i++)
            this.write(data[i], LCD.CHR);
        return this.write(LCD.SETDDRAMADDR, LCD.CMD);
    }
	
    isAlive() {
        var deviceArray = this.i2c.scanSync(this.addr);
        return (deviceArray.length > 0);
    }
}

//# commands
LCD.CLEARDISPLAY = 0x01;
LCD.RETURNHOME = 0x02;
LCD.ENTRYMODESET = 0x04;
LCD.DISPLAYCONTROL = 0x08;
LCD.CURSORSHIFT = 0x10;
LCD.FUNCTIONSET = 0x20;
LCD.SETCGRAMADDR = 0x40;
LCD.SETDDRAMADDR = 0x80;

//# flags for display entry mode
LCD.ENTRYRIGHT = 0x00;
LCD.ENTRYLEFT = 0x02;
LCD.ENTRYSHIFTINCREMENT = 0x01;
LCD.ENTRYSHIFTDECREMENT = 0x00;

//# flags for display on/off control
LCD.DISPLAYON = 0x04;
LCD.DISPLAYOFF = 0x00;
LCD.CURSORON = 0x02;
LCD.CURSOROFF = 0x00;
LCD.BLINKON = 0x01;
LCD.BLINKOFF = 0x00;

//# flags for display/cursor shift
LCD.DISPLAYMOVE = 0x08;
LCD.CURSORMOVE = 0x00;
LCD.MOVERIGHT = 0x04;
LCD.MOVELEFT = 0x00;

//# flags for function set
LCD._8BITMODE = 0x10;
LCD._4BITMODE = 0x00;
LCD._2LINE = 0x08;
LCD._1LINE = 0x00;
LCD._5x10DOTS = 0x04;
LCD._5x8DOTS = 0x00;

//# flags for backlight control
LCD.BACKLIGHT 0x08;
LCD.NOBACKLIGHT 0x00;

//# LCD command
LCD.Enable = 0x04; // Enable bit
LCD.RW = 0x02; // Read/Write bit
LCD.RS = 0x01; // Register select bit
LCD.CMD = 0x00; // Command mode

module.exports = LCD;
