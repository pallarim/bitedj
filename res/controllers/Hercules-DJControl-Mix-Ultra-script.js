//
// ***************************************************************************
// * Mixxx mapping script file for the Hercules DJControl Mix Ultra.
// * Author: DJ Phatso
// * Version 1.2 (July 2025)
// * Forum: https://mixxx.discourse.group
// * Wiki: https://mixxx.org/wiki/doku.php/
//
// v1.2 : 
// - Add Sample Stop (Shift +Pad)
// v1.1 : 
//- Add Master Volume 
//- Add Gain as SHIFT to High EQ 
//- Turn off BT LED at startup
//
// v1.0 : Original mapping
//
// ****************************************************************************
var DJC_MixUltra = {};
///////////////////////////////////////////////////////////////
//                       USER OPTIONS                        //
///////////////////////////////////////////////////////////////

// How fast scratching is.
DJC_MixUltra.scratchScale = 1.0;

// How much faster seeking (shift+scratch) is than scratching.
DJC_MixUltra.scratchShiftMultiplier = 4;

// How fast bending is.
DJC_MixUltra.bendScale = 1.0;

// Other scratch related options
DJC_MixUltra.kScratchActionNone = 0;
DJC_MixUltra.kScratchActionScratch = 1;
DJC_MixUltra.kScratchActionSeek = 2;
DJC_MixUltra.kScratchActionBend = 3;


DJC_MixUltra.init = function() {
    if (engine.getValue("[App]", "num_samplers") < 16) {
        engine.setValue("[App]", "num_samplers", 16);
    }

    // Scratch button state
    DJC_MixUltra.scratchButtonState = true;
    // Scratch Action
    DJC_MixUltra.scratchAction = {
    1: DJC_MixUltra.kScratchActionNone,
    2: DJC_MixUltra.kScratchActionNone
    };

    // BT LED Off.
    midi.sendShortMsg(0x90, 0x7F, 0x00);

};


DJC_MixUltra._scratchEnable = function(deck) {
    var alpha = 1.0/8;
    var beta = alpha/32;
    engine.scratchEnable(deck, 248, 33 + 1/3, alpha, beta);
};

DJC_MixUltra._convertWheelRotation = function(value) {
    // When you rotate the jogwheel, the controller always sends either 0x1
    // (clockwise) or 0x7F (counter clockwise). 0x1 should map to 1, 0x7F
    // should map to -1 (IOW it's 7-bit signed).
    return value < 0x40 ? 1 : -1;
};

// The touch action on the jog wheel's top surface
DJC_MixUltra.wheelTouch = function(channel, control, value, _status, _group) {
    var deck = channel;
    if (value > 0) {
        //  Touching the wheel.
        if (engine.getValue("[Channel" + deck + "]", "play") !== 1 || DJC_MixUltra.scratchButtonState) {
            DJC_MixUltra._scratchEnable(deck);
            DJC_MixUltra.scratchAction[deck] = DJC_MixUltra.kScratchActionScratch;
        } else {
            DJC_MixUltra.scratchAction[deck] = DJC_MixUltra.kScratchActionBend;
        }
    } else {
        // Released the wheel.
        engine.scratchDisable(deck);
        DJC_MixUltra.scratchAction[deck] = DJC_MixUltra.kScratchActionNone;
    }
};

// The touch action on the jog wheel's top surface while holding shift
DJC_MixUltra.wheelTouchShift = function(channel, control, value, _status, _group) {
    var deck = channel - 3;
    // We always enable scratching regardless of button state.
    if (value > 0) {
        DJC_MixUltra._scratchEnable(deck);
        DJC_MixUltra.scratchAction[deck] = DJC_MixUltra.kScratchActionSeek;
    } else {
        // Released the wheel.
        engine.scratchDisable(deck);
        DJC_MixUltra.scratchAction[deck] = DJC_MixUltra.kScratchActionNone;
    }
};

// Scratching on the jog wheel (rotating it while pressing the top surface)
DJC_MixUltra.scratchWheel = function(channel, control, value, status, _group) {
    var deck;
    switch (status) {
    case 0xB1:
    case 0xB4:
        deck  = 1;
        break;
    case 0xB2:
    case 0xB5:
        deck  = 2;
        break;
    default:
        return;
    }
    var interval = DJC_MixUltra._convertWheelRotation(value);
    var scratchAction = DJC_MixUltra.scratchAction[deck];
    if (scratchAction === DJC_MixUltra.kScratchActionScratch) {
        engine.scratchTick(deck, interval * DJC_MixUltra.scratchScale);
    } else if (scratchAction === DJC_MixUltra.kScratchActionSeek) {
        engine.scratchTick(deck,
            interval *  DJC_MixUltra.scratchScale *
            DJC_MixUltra.scratchShiftMultiplier);
    } else {
        engine.setValue(
            "[Channel" + deck + "]", "jog", interval * DJC_MixUltra.bendScale);
    }
};

// Bending on the jog wheel (rotating using the edge)
DJC_MixUltra.bendWheel = function(channel, control, value, _status, _group) {
    var interval = DJC_MixUltra._convertWheelRotation(value);
    engine.setValue(
        "[Channel" + channel + "]", "jog", interval * DJC_MixUltra.bendScale);
};

DJC_MixUltra.shutdown = function() {
    midi.sendShortMsg(0xB0, 0x7F, 0x00);
};
