'use strict';


function isColor(str) {
    str = str.trim();
    if (str in colorPalettes.arnecolors)
        return true;
    if (/^#([0-9A-F]{3}){1,2}$/i.test(str))
        return true;
    if (str === "transparent")
        return true;
    return false;
}

function colorToHex(palette, str) {
    str = str.trim();
    if (str in palette) {
        return palette[str];
    }

    return str;
}


function generateSpriteMatrix(dat) {

    var result = [];
    for (var i = 0; i < dat.length; i++) {
        var row = [];
        for (var j = 0; j < dat.length; j++) {
            var ch = dat[i].charAt(j);
            if (ch == '.') {
                row.push(-1);
            } else {
                row.push(ch);
            }
        }
        result.push(row);
    }
    return result;
}

var debugMode;
var colorPalette;

function generateExtraMembers(state) {

    if (state.collisionLayers.length === 0) {
        logError("No collision layers defined.  All objects need to be in collision layers.");
    }

    //annotate objects with layers
    //assign ids at the same time
    state.idDict = [];
    var idcount = 0;
    for (var layerIndex = 0; layerIndex < state.collisionLayers.length; layerIndex++) {
        for (var j = 0; j < state.collisionLayers[layerIndex].length; j++) {
            var n = state.collisionLayers[layerIndex][j];
            if (n in state.objects) {
                var o = state.objects[n];
                o.layer = layerIndex;
                o.id = idcount;
                state.idDict[idcount] = n;
                idcount++;
            }
        }
    }

    //set object count
    state.objectCount = idcount;

    //calculate blank mask template
    var layerCount = state.collisionLayers.length;
    var blankMask = [];
    for (var i = 0; i < layerCount; i++) {
        blankMask.push(-1);
    }

    // how many words do our bitvecs need to hold?
    STRIDE_OBJ = Math.ceil(state.objectCount / 32) | 0;
    STRIDE_MOV = Math.ceil(layerCount / 5) | 0;
    state.STRIDE_OBJ = STRIDE_OBJ;
    state.STRIDE_MOV = STRIDE_MOV;

    //get colorpalette name
    debugMode = false;
    verbose_logging = false;
    throttle_movement = false;
    colorPalette = colorPalettes.arnecolors;
    for (var i = 0; i < state.metadata.length; i += 2) {
        var key = state.metadata[i];
        var val = state.metadata[i + 1];
        if (key === 'color_palette') {
            if (val in colorPalettesAliases) {
                val = colorPalettesAliases[val];
            }
            if (colorPalettes[val] === undefined) {
                logError('Palette "' + val + '" not found, defaulting to arnecolors.', 0);
            } else {
                colorPalette = colorPalettes[val];
            }
        } else if (key === 'debug') {
            if (IDE && unitTesting===false){
                debugMode = true;
                cache_console_messages = true;
            }
        } else if (key === 'verbose_logging') {
            if (IDE && unitTesting===false){
                verbose_logging = true;
                cache_console_messages = true;
            }
        } else if (key === 'throttle_movement') {
            throttle_movement = true;
        }
    }

    //convert colors to hex
    for (var n in state.objects) {
        if (state.objects.hasOwnProperty(n)) {
            //convert color to hex
            var o = state.objects[n];
            if (o.colors.length > 10) {
                logError("a sprite cannot have more than 10 colors.  Why you would want more than 10 is beyond me.", o.lineNumber + 1);
            }
            for (var i = 0; i < o.colors.length; i++) {
                var c = o.colors[i];
                if (isColor(c)) {
                    c = colorToHex(colorPalette, c);
                    o.colors[i] = c;
                } else {
                    logError('Invalid color specified for object "' + n + '", namely "' + o.colors[i] + '".', o.lineNumber + 1);
                    o.colors[i] = '#ff00ff'; // magenta error color
                }
            }
        }
    }

    //generate sprite matrix
    for (var n in state.objects) {
        if (state.objects.hasOwnProperty(n)) {
            var o = state.objects[n];
            if (o.colors.length == 0) {
                logError('color not specified for object "' + n + '".', o.lineNumber);
                o.colors = ["#ff00ff"];
            }
            if (o.spritematrix.length === 0) {
                o.spritematrix = [
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0]
                ];
            } else {
                if (o.spritematrix.length !== 5 || o.spritematrix[0].length !== 5 || o.spritematrix[1].length !== 5 || o.spritematrix[2].length !== 5 || o.spritematrix[3].length !== 5 || o.spritematrix[4].length !== 5) {
                    logWarning("Sprite graphics must be 5 wide and 5 high exactly.", o.lineNumber);
                }
                o.spritematrix = generateSpriteMatrix(o.spritematrix);
            }
        }
    }

    var glyphOrder = [];
    //calculate glyph dictionary
    var glyphDict = {};
    for (var n in state.objects) {
        if (state.objects.hasOwnProperty(n)) {
            var o = state.objects[n];
            var mask = blankMask.concat([]);
            mask[o.layer] = o.id;
            glyphDict[n] = mask;
            glyphOrder.push([o.lineNumber,n]);
        }
    }
    
    var added = true;
    while (added) 
    {
        added = false;

        //then, synonyms
        for (var i = 0; i < state.legend_synonyms.length; i++) {
            var dat = state.legend_synonyms[i];
            var key = dat[0];
            var val = dat[1];
            if ((!(key in glyphDict) || (glyphDict[key] === undefined)) && (glyphDict[val] !== undefined)) {
                added = true;
                glyphDict[key] = glyphDict[val];
                glyphOrder.push([dat.lineNumber,key]);
            } 
        }

        //then, aggregates
        for (var i = 0; i < state.legend_aggregates.length; i++) {
            var dat = state.legend_aggregates[i];
            var key = dat[0];
            var vals = dat.slice(1);
            var allVallsFound = true;
            for (var j = 0; j < vals.length; j++) {
                var v = vals[j];
                if (glyphDict[v] === undefined) {
                    allVallsFound = false;
                    break;
                }
            }
            if ((!(key in glyphDict) || (glyphDict[key] === undefined)) && allVallsFound) {
                var mask = blankMask.concat([]);

                for (var j = 1; j < dat.length; j++) {
                    var n = dat[j];
                    var o = state.objects[n];
                    if (o == undefined) {
                        logError('Object not found with name ' + n, state.lineNumber);
                    }
                    if (mask[o.layer] == -1) {
                        mask[o.layer] = o.id;
                    } else {
                        if (o.layer === undefined) {
                            logError('Object "' + n.toUpperCase() + '" has been defined, but not assigned to a layer.', dat.lineNumber);
                        } else {
                            var n1 = n.toUpperCase();
                            var n2 = state.idDict[mask[o.layer]].toUpperCase();
                            // if (n1 !== n2) {
                                logError(
                                    'Trying to create an aggregate object (something defined in the LEGEND section using AND) with both "' +
                                    n1 + '" and "' + n2 + '", which are on the same layer and therefore can\'t coexist.',
                                    dat.lineNumber
                                );
                            // }
                        }
                    }
                }
                added = true;
                glyphDict[dat[0]] = mask;
                glyphOrder.push([dat.lineNumber,key]);
            }
        }
    }
    
    //sort glyphs line number
    glyphOrder.sort((a,b)=>a[0] - b[0]);
    glyphOrder = glyphOrder.map(a=>a[1]);

    state.glyphDict = glyphDict;
    state.glyphOrder = glyphOrder;

    var aggregatesDict = {};
    for (var i = 0; i < state.legend_aggregates.length; i++) {
        var entry = state.legend_aggregates[i];
        aggregatesDict[entry[0]] = entry.slice(1);
    }
    state.aggregatesDict = aggregatesDict;

    var propertiesDict = {};
    for (var i = 0; i < state.legend_properties.length; i++) {
        var entry = state.legend_properties[i];
        propertiesDict[entry[0]] = entry.slice(1);
    }
    state.propertiesDict = propertiesDict;

    //calculate lookup dictionaries
    var synonymsDict = {};
    for (var i = 0; i < state.legend_synonyms.length; i++) {
        var entry = state.legend_synonyms[i];
        var key = entry[0];
        var value = entry[1];
        if (value in aggregatesDict) {
            aggregatesDict[key] = aggregatesDict[value];
        } else if (value in propertiesDict) {
            propertiesDict[key] = propertiesDict[value];
        } else if (key !== value) {
            synonymsDict[key] = value;
        }
    }
    state.synonymsDict = synonymsDict;

    var modified = true;
    while (modified) {
        modified = false;
        for (var n in synonymsDict) {
            if (synonymsDict.hasOwnProperty(n)) {
                var value = synonymsDict[n];
                if (value in propertiesDict) {
                    delete synonymsDict[n];
                    propertiesDict[n] = propertiesDict[value];
                    modified = true;
                } else if (value in aggregatesDict) {
                    delete aggregatesDict[n];
                    aggregatesDict[n] = aggregatesDict[value];
                    modified = true;
                } else if (value in synonymsDict) {
                    synonymsDict[n] = synonymsDict[value];
                }
            }
        }

        for (var n in propertiesDict) {
            if (propertiesDict.hasOwnProperty(n)) {
                var values = propertiesDict[n];
                for (var i = 0; i < values.length; i++) {
                    var value = values[i];
                    if (value in synonymsDict) {
                        values[i] = synonymsDict[value];
                        modified = true;
                    } else if (value in propertiesDict) {
                        values.splice(i, 1);
                        var newvalues = propertiesDict[value];
                        for (var j = 0; j < newvalues.length; j++) {
                            var newvalue = newvalues[j];
                            if (values.indexOf(newvalue) === -1) {
                                values.push(newvalue);
                            }
                        }
                        modified = true;
                    }
                    if (value in aggregatesDict) {
                        logError('Trying to define property "' + n.toUpperCase() + '" in terms of aggregate "' + value.toUpperCase() + '".');
                    }
                }
            }
        }


        for (var n in aggregatesDict) {
            if (aggregatesDict.hasOwnProperty(n)) {
                var values = aggregatesDict[n];
                for (var i = 0; i < values.length; i++) {
                    var value = values[i];
                    if (value in synonymsDict) {
                        values[i] = synonymsDict[value];
                        modified = true;
                    } else if (value in aggregatesDict) {
                        values.splice(i, 1);
                        var newvalues = aggregatesDict[value];
                        for (var j = 0; j < newvalues.length; j++) {
                            var newvalue = newvalues[j];
                            if (values.indexOf(newvalue) === -1) {
                                values.push(newvalue);
                            }
                        }
                        modified = true;
                    }
                    if (value in propertiesDict) {
                        logError('Trying to define aggregate "' + n.toUpperCase() + '" in terms of property "' + value.toUpperCase() + '".');
                    }
                }
            }
        }
    }

    /* determine which properties specify objects all on one layer */
    state.propertiesSingleLayer = {};
    for (var key in propertiesDict) {
        if (propertiesDict.hasOwnProperty(key)) {
            var values = propertiesDict[key];
            var sameLayer = true;
            for (var i = 1; i < values.length; i++) {
                if ((state.objects[values[i - 1]].layer !== state.objects[values[i]].layer)) {
                    sameLayer = false;
                    break;
                }
            }
            if (sameLayer) {
                state.propertiesSingleLayer[key] = state.objects[values[0]].layer;
            }
        }
    }

    if (state.idDict[0] === undefined && state.collisionLayers.length > 0) {
        logError('You need to have some objects defined');
    }

    //set default background object
    var backgroundid;
    var backgroundlayer;
    if (state.objects.background === undefined) {
        if ('background' in state.synonymsDict) {
            var n = state.synonymsDict['background'];
            var o = state.objects[n];
            backgroundid = o.id;
            backgroundlayer = o.layer;
        } else if ('background' in state.propertiesDict) {
            var backgrounddef = state.propertiesDict['background'];
            var n = backgrounddef[0];
            var o = state.objects[n];
            backgroundid = o.id;
            backgroundlayer = o.layer;
            for (var i=1;i<backgrounddef.length;i++){
                var nnew = backgrounddef[i];
                var onew = state.objects[nnew];
                if (onew.layer !== backgroundlayer) {
                    var lineNumber = state.original_line_numbers['background'];
                    logError('Background objects must be on the same layer',lineNumber);
                }
            }
        } else if ('background' in state.aggregatesDict) {
            var o = state.objects[state.idDict[0]];
            backgroundid = o.id;
            backgroundlayer = o.layer;
            var lineNumber = state.original_line_numbers['background'];
            logError("background cannot be an aggregate (declared with 'and'), it has to be a simple type, or property (declared in terms of others using 'or').",lineNumber);
        } else {
            var o = state.objects[state.idDict[0]];
            if (o!=null){
                backgroundid = o.id;
                backgroundlayer = o.layer;
            }
            logError("you have to define something to be the background");
        }
    } else {
        backgroundid = state.objects.background.id;
        backgroundlayer = state.objects.background.layer;
    }
    state.backgroundid = backgroundid;
    state.backgroundlayer = backgroundlayer;
}

Level.prototype.calcBackgroundMask = function(state) {
    if (state.backgroundlayer === undefined) {
        logError("you have to have a background layer");
    }

    var backgroundMask = state.layerMasks[state.backgroundlayer];
    for (var i = 0; i < this.n_tiles; i++) {
        var cell = this.getCell(i);
        cell.iand(backgroundMask);
        if (!cell.iszero()) {
            return cell;
        }
    }
    cell = new BitVec(STRIDE_OBJ);
    cell.ibitset(state.backgroundid);
    return cell;
}

function levelFromString(state, level) {
    var backgroundlayer = state.backgroundlayer;
    var backgroundid = state.backgroundid;
    var backgroundLayerMask = state.layerMasks[backgroundlayer];
    var o = new Level(level[0], level[1].length, level.length - 1, state.collisionLayers.length, null);
    o.objects = new Int32Array(o.width * o.height * STRIDE_OBJ);

    for (var i = 0; i < o.width; i++) {
        for (var j = 0; j < o.height; j++) {
            var ch = level[j + 1].charAt(i);
            if (ch.length == 0) {
                ch = level[j + 1].charAt(level[j + 1].length - 1);
            }
            var mask = state.glyphDict[ch];

            if (mask == undefined) {
                if (state.propertiesDict[ch] === undefined) {
                    logError('Error, symbol "' + ch + '", used in map, not found.', level[0] + j);
                } else {
                    logError('Error, symbol "' + ch + '" is defined using OR, and therefore ambiguous - it cannot be used in a map. Did you mean to define it in terms of AND?', level[0] + j);
                }
                return o;
            }

            var maskint = new BitVec(STRIDE_OBJ);
            mask = mask.concat([]);
            for (var z = 0; z < o.layerCount; z++) {
                if (mask[z] >= 0) {
                    maskint.ibitset(mask[z]);
                }
            }
            for (var w = 0; w < STRIDE_OBJ; ++w) {
                o.objects[STRIDE_OBJ * (i * o.height + j) + w] = maskint.data[w];
            }
        }
    }

    var levelBackgroundMask = o.calcBackgroundMask(state);
    for (var i = 0; i < o.n_tiles; i++) {
        var cell = o.getCell(i);
        if (!backgroundLayerMask.anyBitsInCommon(cell)) {
            cell.ior(levelBackgroundMask);
            o.setCell(i, cell);
        }
    }
    return o;
}
//also assigns glyphDict
function levelsToArray(state) {
    var levels = state.levels;
    var processedLevels = [];

    for (var levelIndex = 0; levelIndex < levels.length; levelIndex++) {
        var level = levels[levelIndex];
        if (level.length == 0) {
            continue;
        }
        if (level[0] == '\n') {

            var o = {
                message: level[1]
            };
            splitMessage = wordwrap(o.message, intro_template[0].length);
            if (splitMessage.length > 12) {
                logWarning('Message too long to fit on screen.', level[2]);
            }

            processedLevels.push(o);
        } else {
            var o = levelFromString(state, level);
            processedLevels.push(o);
        }

    }

    state.levels = processedLevels;
}

var directionaggregates = {
    'horizontal': ['left', 'right'],
    'horizontal_par': ['left', 'right'],
    'horizontal_perp': ['left', 'right'],
    'vertical': ['up', 'down'],
    'vertical_par': ['up', 'down'],
    'vertical_perp': ['up', 'down'],
    'moving': ['up', 'down', 'left', 'right', 'action'],
    'orthogonal': ['up', 'down', 'left', 'right'],
    'perpendicular': ['^', 'v'],
    'parallel': ['<', '>']
};

var relativeDirections = ['^', 'v', '<', '>', 'perpendicular', 'parallel'];
var simpleAbsoluteDirections = ['up', 'down', 'left', 'right'];
var simpleRelativeDirections = ['^', 'v', '<', '>'];
var reg_directions_only = /^(\>|\<|\^|v|up|down|left|right|moving|stationary|no|randomdir|random|horizontal|vertical|orthogonal|perpendicular|parallel|action)$/;
//redeclaring here, i don't know why
var commandwords = [ "sfx0", "sfx1", "sfx2", "sfx3", "sfx4", "sfx5", "sfx6", "sfx7", "sfx8", "sfx9", "sfx10", "sfx11", "sfx12", "sfx13", "sfx14", "sfx15", "sfx16", "sfx17", "sfx18", "sfx19", "sfx20", "sfx21", "sfx22", "sfx23", "sfx24", "sfx25", "sfx26", "sfx27", "sfx28", "sfx29", "sfx30", "sfx31", "sfx32", "sfx33", "sfx34", "sfx35", "sfx36", "sfx37", "sfx38", "sfx39", "sfx40", "sfx41", "sfx42", "sfx43", "sfx44", "sfx45", "sfx46", "sfx47", "sfx48", "sfx49", "sfx50", "sfx51", "sfx52", "sfx53", "sfx54", "sfx55", "sfx56", "sfx57", "sfx58", "sfx59", "sfx60", "sfx61", "sfx62", "sfx63", "sfx64", "sfx65", "sfx66", "sfx67", "sfx68", "sfx69", "sfx70", "sfx71", "sfx72", "sfx73", "sfx74", "sfx75", "sfx76", "sfx77", "sfx78", "sfx79", "sfx80", "sfx81", "sfx82", "sfx83", "sfx84", "sfx85", "sfx86", "sfx87", "sfx88", "sfx89", "sfx90", "sfx91", "sfx92", "sfx93", "sfx94", "sfx95", "sfx96", "sfx97", "sfx98", "sfx99", "sfx100", "sfx101", "sfx102", "sfx103", "sfx104", "sfx105", "sfx106", "sfx107", "sfx108", "sfx109", "sfx110", "sfx111", "sfx112", "sfx113", "sfx114", "sfx115", "sfx116", "sfx117", "sfx118", "sfx119", "sfx120", "sfx121", "sfx122", "sfx123", "sfx124", "sfx125", "sfx126", "sfx127", "sfx128", "sfx129", "sfx130", "sfx131", "sfx132", "sfx133", "sfx134", "sfx135", "sfx136", "sfx137", "sfx138", "sfx139", "sfx140", "sfx141", "sfx142", "sfx143", "sfx144", "sfx145", "sfx146", "sfx147", "sfx148", "sfx149", "sfx150", "sfx151", "sfx152", "sfx153", "sfx154", "sfx155", "sfx156", "sfx157", "sfx158", "sfx159", "sfx160", "sfx161", "sfx162", "sfx163", "sfx164", "sfx165", "sfx166", "sfx167", "sfx168", "sfx169", "sfx170", "sfx171", "sfx172", "sfx173", "sfx174", "sfx175", "sfx176", "sfx177", "sfx178", "sfx179", "sfx180", "sfx181", "sfx182", "sfx183", "sfx184", "sfx185", "sfx186", "sfx187", "sfx188", "sfx189", "sfx190", "sfx191", "sfx192", "sfx193", "sfx194", "sfx195", "sfx196", "sfx197", "sfx198", "sfx199", "sfx200", "sfx201", "sfx202", "sfx203", "sfx204", "sfx205", "sfx206", "sfx207", "sfx208", "sfx209", "sfx210", "sfx211", "sfx212", "sfx213", "sfx214", "sfx215", "sfx216", "sfx217", "sfx218", "sfx219", "sfx220", "sfx221", "sfx222", "sfx223", "sfx224", "sfx225", "sfx226", "sfx227", "sfx228", "sfx229", "sfx230", "sfx231", "sfx232", "sfx233", "sfx234", "sfx235", "sfx236", "sfx237", "sfx238", "sfx239", "sfx240", "sfx241", "sfx242", "sfx243", "sfx244", "sfx245", "sfx246", "sfx247", "sfx248", "sfx249", "sfx250", "sfx251", "sfx252", "sfx253", "sfx254", "sfx255", "sfx256", "sfx257", "sfx258", "sfx259", "sfx260", "sfx261", "sfx262", "sfx263", "sfx264", "sfx265", "sfx266", "sfx267", "sfx268", "sfx269", "sfx270", "sfx271", "sfx272", "sfx273", "sfx274", "sfx275", "sfx276", "sfx277", "sfx278", "sfx279", "sfx280", "sfx281", "sfx282", "sfx283", "sfx284", "sfx285", "sfx286", "sfx287", "sfx288", "sfx289", "sfx290", "sfx291", "sfx292", "sfx293", "sfx294", "sfx295", "sfx296", "sfx297", "sfx298", "sfx299", "sfx300", "sfx301", "sfx302", "sfx303", "sfx304", "sfx305", "sfx306", "sfx307", "sfx308", "sfx309", "sfx310", "sfx311", "sfx312", "sfx313", "sfx314", "sfx315", "sfx316", "sfx317", "sfx318", "sfx319", "sfx320", "sfx321", "sfx322", "sfx323", "sfx324", "sfx325", "sfx326", "sfx327", "sfx328", "sfx329", "sfx330", "sfx331", "sfx332", "sfx333", "sfx334", "sfx335", "sfx336", "sfx337", "sfx338", "sfx339", "sfx340", "sfx341", "sfx342", "sfx343", "sfx344", "sfx345", "sfx346", "sfx347", "sfx348", "sfx349", "sfx350", "sfx351", "sfx352", "sfx353", "sfx354", "sfx355", "sfx356", "sfx357", "sfx358", "sfx359", "sfx360", "sfx361", "sfx362", "sfx363", "sfx364", "sfx365", "sfx366", "sfx367", "sfx368", "sfx369", "sfx370", "sfx371", "sfx372", "sfx373", "sfx374", "sfx375", "sfx376", "sfx377", "sfx378", "sfx379", "sfx380", "sfx381", "sfx382", "sfx383", "sfx384", "sfx385", "sfx386", "sfx387", "sfx388", "sfx389", "sfx390", "sfx391", "sfx392", "sfx393", "sfx394", "sfx395", "sfx396", "sfx397", "sfx398", "sfx399", "sfx400", "sfx401", "sfx402", "sfx403", "sfx404", "sfx405", "sfx406", "sfx407", "sfx408", "sfx409", "sfx410", "sfx411", "sfx412", "sfx413", "sfx414", "sfx415", "sfx416", "sfx417", "sfx418", "sfx419", "sfx420", "sfx421", "sfx422", "sfx423", "sfx424", "sfx425", "sfx426", "sfx427", "sfx428", "sfx429", "sfx430", "sfx431", "sfx432", "sfx433", "sfx434", "sfx435", "sfx436", "sfx437", "sfx438", "sfx439", "sfx440", "sfx441", "sfx442", "sfx443", "sfx444", "sfx445", "sfx446", "sfx447", "sfx448", "sfx449", "sfx450", "sfx451", "sfx452", "sfx453", "sfx454", "sfx455", "sfx456", "sfx457", "sfx458", "sfx459", "sfx460", "sfx461", "sfx462", "sfx463", "sfx464", "sfx465", "sfx466", "sfx467", "sfx468", "sfx469", "sfx470", "sfx471", "sfx472", "sfx473", "sfx474", "sfx475", "sfx476", "sfx477", "sfx478", "sfx479", "sfx480", "sfx481", "sfx482", "sfx483", "sfx484", "sfx485", "sfx486", "sfx487", "sfx488", "sfx489", "sfx490", "sfx491", "sfx492", "sfx493", "sfx494", "sfx495", "sfx496", "sfx497", "sfx498", "sfx499", "sfx500", "sfx501", "sfx502", "sfx503", "sfx504", "sfx505", "sfx506", "sfx507", "sfx508", "sfx509", "sfx510", "sfx511", "sfx512", "sfx513", "sfx514", "sfx515", "sfx516", "sfx517", "sfx518", "sfx519", "sfx520", "sfx521", "sfx522", "sfx523", "sfx524", "sfx525", "sfx526", "sfx527", "sfx528", "sfx529", "sfx530", "sfx531", "sfx532", "sfx533", "sfx534", "sfx535", "sfx536", "sfx537", "sfx538", "sfx539", "sfx540", "sfx541", "sfx542", "sfx543", "sfx544", "sfx545", "sfx546", "sfx547", "sfx548", "sfx549", "sfx550", "sfx551", "sfx552", "sfx553", "sfx554", "sfx555", "sfx556", "sfx557", "sfx558", "sfx559", "sfx560", "sfx561", "sfx562", "sfx563", "sfx564", "sfx565", "sfx566", "sfx567", "sfx568", "sfx569", "sfx570", "sfx571", "sfx572", "sfx573", "sfx574", "sfx575", "sfx576", "sfx577", "sfx578", "sfx579", "sfx580", "sfx581", "sfx582", "sfx583", "sfx584", "sfx585", "sfx586", "sfx587", "sfx588", "sfx589", "sfx590", "sfx591", "sfx592", "sfx593", "sfx594", "sfx595", "sfx596", "sfx597", "sfx598", "sfx599", "sfx600", "sfx601", "sfx602", "sfx603", "sfx604", "sfx605", "sfx606", "sfx607", "sfx608", "sfx609", "sfx610", "sfx611", "sfx612", "sfx613", "sfx614", "sfx615", "sfx616", "sfx617", "sfx618", "sfx619", "sfx620", "sfx621", "sfx622", "sfx623", "sfx624", "sfx625", "sfx626", "sfx627", "sfx628", "sfx629", "sfx630", "sfx631", "sfx632", "sfx633", "sfx634", "sfx635", "sfx636", "sfx637", "sfx638", "sfx639", "sfx640", "sfx641", "sfx642", "sfx643", "sfx644", "sfx645", "sfx646", "sfx647", "sfx648", "sfx649", "sfx650", "sfx651", "sfx652", "sfx653", "sfx654", "sfx655", "sfx656", "sfx657", "sfx658", "sfx659", "sfx660", "sfx661", "sfx662", "sfx663", "sfx664", "sfx665", "sfx666", "sfx667", "sfx668", "sfx669", "sfx670", "sfx671", "sfx672", "sfx673", "sfx674", "sfx675", "sfx676", "sfx677", "sfx678", "sfx679", "sfx680", "sfx681", "sfx682", "sfx683", "sfx684", "sfx685", "sfx686", "sfx687", "sfx688", "sfx689", "sfx690", "sfx691", "sfx692", "sfx693", "sfx694", "sfx695", "sfx696", "sfx697", "sfx698", "sfx699", "sfx700", "sfx701", "sfx702", "sfx703", "sfx704", "sfx705", "sfx706", "sfx707", "sfx708", "sfx709", "sfx710", "sfx711", "sfx712", "sfx713", "sfx714", "sfx715", "sfx716", "sfx717", "sfx718", "sfx719", "sfx720", "sfx721", "sfx722", "sfx723", "sfx724", "sfx725", "sfx726", "sfx727", "sfx728", "sfx729", "sfx730", "sfx731", "sfx732", "sfx733", "sfx734", "sfx735", "sfx736", "sfx737", "sfx738", "sfx739", "sfx740", "sfx741", "sfx742", "sfx743", "sfx744", "sfx745", "sfx746", "sfx747", "sfx748", "sfx749", "sfx750", "sfx751", "sfx752", "sfx753", "sfx754", "sfx755", "sfx756", "sfx757", "sfx758", "sfx759", "sfx760", "sfx761", "sfx762", "sfx763", "sfx764", "sfx765", "sfx766", "sfx767", "sfx768", "sfx769", "sfx770", "sfx771", "sfx772", "sfx773", "sfx774", "sfx775", "sfx776", "sfx777", "sfx778", "sfx779", "sfx780", "sfx781", "sfx782", "sfx783", "sfx784", "sfx785", "sfx786", "sfx787", "sfx788", "sfx789", "sfx790", "sfx791", "sfx792", "sfx793", "sfx794", "sfx795", "sfx796", "sfx797", "sfx798", "sfx799", "sfx800", "sfx801", "sfx802", "sfx803", "sfx804", "sfx805", "sfx806", "sfx807", "sfx808", "sfx809", "sfx810", "sfx811", "sfx812", "sfx813", "sfx814", "sfx815", "sfx816", "sfx817", "sfx818", "sfx819", "sfx820", "sfx821", "sfx822", "sfx823", "sfx824", "sfx825", "sfx826", "sfx827", "sfx828", "sfx829", "sfx830", "sfx831", "sfx832", "sfx833", "sfx834", "sfx835", "sfx836", "sfx837", "sfx838", "sfx839", "sfx840", "sfx841", "sfx842", "sfx843", "sfx844", "sfx845", "sfx846", "sfx847", "sfx848", "sfx849", "sfx850", "sfx851", "sfx852", "sfx853", "sfx854", "sfx855", "sfx856", "sfx857", "sfx858", "sfx859", "sfx860", "sfx861", "sfx862", "sfx863", "sfx864", "sfx865", "sfx866", "sfx867", "sfx868", "sfx869", "sfx870", "sfx871", "sfx872", "sfx873", "sfx874", "sfx875", "sfx876", "sfx877", "sfx878", "sfx879", "sfx880", "sfx881", "sfx882", "sfx883", "sfx884", "sfx885", "sfx886", "sfx887", "sfx888", "sfx889", "sfx890", "sfx891", "sfx892", "sfx893", "sfx894", "sfx895", "sfx896", "sfx897", "sfx898", "sfx899", "sfx900", "sfx901", "sfx902", "sfx903", "sfx904", "sfx905", "sfx906", "sfx907", "sfx908", "sfx909", "sfx910", "sfx911", "sfx912", "sfx913", "sfx914", "sfx915", "sfx916", "sfx917", "sfx918", "sfx919", "sfx920", "sfx921", "sfx922", "sfx923", "sfx924", "sfx925", "sfx926", "sfx927", "sfx928", "sfx929", "sfx930", "sfx931", "sfx932", "sfx933", "sfx934", "sfx935", "sfx936", "sfx937", "sfx938", "sfx939", "sfx940", "sfx941", "sfx942", "sfx943", "sfx944", "sfx945", "sfx946", "sfx947", "sfx948", "sfx949", "sfx950", "sfx951", "sfx952", "sfx953", "sfx954", "sfx955", "sfx956", "sfx957", "sfx958", "sfx959", "sfx960", "sfx961", "sfx962", "sfx963", "sfx964", "sfx965", "sfx966", "sfx967", "sfx968", "sfx969", "sfx970", "sfx971", "sfx972", "sfx973", "sfx974", "sfx975", "sfx976", "sfx977", "sfx978", "sfx979", "sfx980", "sfx981", "sfx982", "sfx983", "sfx984", "sfx985", "sfx986", "sfx987", "sfx988", "sfx989", "sfx990", "sfx991", "sfx992", "sfx993", "sfx994", "sfx995", "sfx996", "sfx997", "sfx998", "sfx999", "bgm0", "bgm1", "bgm2", "bgm3", "bgm4", "bgm5", "bgm6", "bgm7", "bgm8", "bgm9", "bgm10", "bgm11", "bgm12", "bgm13", "bgm14", "bgm15", "bgm16", "bgm17", "bgm18", "bgm19", "bgm20", "bgm21", "bgm22", "bgm23", "bgm24", "bgm25", "bgm26", "bgm27", "bgm28", "bgm29", "bgm30", "bgm31", "bgm32", "bgm33", "bgm34", "bgm35", "bgm36", "bgm37", "bgm38", "bgm39", "bgm40", "bgm41", "bgm42", "bgm43", "bgm44", "bgm45", "bgm46", "bgm47", "bgm48", "bgm49", "bgm50", "bgm51", "bgm52", "bgm53", "bgm54", "bgm55", "bgm56", "bgm57", "bgm58", "bgm59", "bgm60", "bgm61", "bgm62", "bgm63", "bgm64", "bgm65", "bgm66", "bgm67", "bgm68", "bgm69", "bgm70", "bgm71", "bgm72", "bgm73", "bgm74", "bgm75", "bgm76", "bgm77", "bgm78", "bgm79", "bgm80", "bgm81", "bgm82", "bgm83", "bgm84", "bgm85", "bgm86", "bgm87", "bgm88", "bgm89", "bgm90", "bgm91", "bgm92", "bgm93", "bgm94", "bgm95", "bgm96", "bgm97", "bgm98", "bgm99", "bgm100", "bgm101", "bgm102", "bgm103", "bgm104", "bgm105", "bgm106", "bgm107", "bgm108", "bgm109", "bgm110", "bgm111", "bgm112", "bgm113", "bgm114", "bgm115", "bgm116", "bgm117", "bgm118", "bgm119", "bgm120", "bgm121", "bgm122", "bgm123", "bgm124", "bgm125", "bgm126", "bgm127", "bgm128", "bgm129", "bgm130", "bgm131", "bgm132", "bgm133", "bgm134", "bgm135", "bgm136", "bgm137", "bgm138", "bgm139", "bgm140", "bgm141", "bgm142", "bgm143", "bgm144", "bgm145", "bgm146", "bgm147", "bgm148", "bgm149", "bgm150", "bgm151", "bgm152", "bgm153", "bgm154", "bgm155", "bgm156", "bgm157", "bgm158", "bgm159", "bgm160", "bgm161", "bgm162", "bgm163", "bgm164", "bgm165", "bgm166", "bgm167", "bgm168", "bgm169", "bgm170", "bgm171", "bgm172", "bgm173", "bgm174", "bgm175", "bgm176", "bgm177", "bgm178", "bgm179", "bgm180", "bgm181", "bgm182", "bgm183", "bgm184", "bgm185", "bgm186", "bgm187", "bgm188", "bgm189", "bgm190", "bgm191", "bgm192", "bgm193", "bgm194", "bgm195", "bgm196", "bgm197", "bgm198", "bgm199", "bgm200", "bgm201", "bgm202", "bgm203", "bgm204", "bgm205", "bgm206", "bgm207", "bgm208", "bgm209", "bgm210", "bgm211", "bgm212", "bgm213", "bgm214", "bgm215", "bgm216", "bgm217", "bgm218", "bgm219", "bgm220", "bgm221", "bgm222", "bgm223", "bgm224", "bgm225", "bgm226", "bgm227", "bgm228", "bgm229", "bgm230", "bgm231", "bgm232", "bgm233", "bgm234", "bgm235", "bgm236", "bgm237", "bgm238", "bgm239", "bgm240", "bgm241", "bgm242", "bgm243", "bgm244", "bgm245", "bgm246", "bgm247", "bgm248", "bgm249", "bgm250", "bgm251", "bgm252", "bgm253", "bgm254", "bgm255", "bgm256", "bgm257", "bgm258", "bgm259", "bgm260", "bgm261", "bgm262", "bgm263", "bgm264", "bgm265", "bgm266", "bgm267", "bgm268", "bgm269", "bgm270", "bgm271", "bgm272", "bgm273", "bgm274", "bgm275", "bgm276", "bgm277", "bgm278", "bgm279", "bgm280", "bgm281", "bgm282", "bgm283", "bgm284", "bgm285", "bgm286", "bgm287", "bgm288", "bgm289", "bgm290", "bgm291", "bgm292", "bgm293", "bgm294", "bgm295", "bgm296", "bgm297", "bgm298", "bgm299", "bgm300", "bgm301", "bgm302", "bgm303", "bgm304", "bgm305", "bgm306", "bgm307", "bgm308", "bgm309", "bgm310", "bgm311", "bgm312", "bgm313", "bgm314", "bgm315", "bgm316", "bgm317", "bgm318", "bgm319", "bgm320", "bgm321", "bgm322", "bgm323", "bgm324", "bgm325", "bgm326", "bgm327", "bgm328", "bgm329", "bgm330", "bgm331", "bgm332", "bgm333", "bgm334", "bgm335", "bgm336", "bgm337", "bgm338", "bgm339", "bgm340", "bgm341", "bgm342", "bgm343", "bgm344", "bgm345", "bgm346", "bgm347", "bgm348", "bgm349", "bgm350", "bgm351", "bgm352", "bgm353", "bgm354", "bgm355", "bgm356", "bgm357", "bgm358", "bgm359", "bgm360", "bgm361", "bgm362", "bgm363", "bgm364", "bgm365", "bgm366", "bgm367", "bgm368", "bgm369", "bgm370", "bgm371", "bgm372", "bgm373", "bgm374", "bgm375", "bgm376", "bgm377", "bgm378", "bgm379", "bgm380", "bgm381", "bgm382", "bgm383", "bgm384", "bgm385", "bgm386", "bgm387", "bgm388", "bgm389", "bgm390", "bgm391", "bgm392", "bgm393", "bgm394", "bgm395", "bgm396", "bgm397", "bgm398", "bgm399", "bgm400", "bgm401", "bgm402", "bgm403", "bgm404", "bgm405", "bgm406", "bgm407", "bgm408", "bgm409", "bgm410", "bgm411", "bgm412", "bgm413", "bgm414", "bgm415", "bgm416", "bgm417", "bgm418", "bgm419", "bgm420", "bgm421", "bgm422", "bgm423", "bgm424", "bgm425", "bgm426", "bgm427", "bgm428", "bgm429", "bgm430", "bgm431", "bgm432", "bgm433", "bgm434", "bgm435", "bgm436", "bgm437", "bgm438", "bgm439", "bgm440", "bgm441", "bgm442", "bgm443", "bgm444", "bgm445", "bgm446", "bgm447", "bgm448", "bgm449", "bgm450", "bgm451", "bgm452", "bgm453", "bgm454", "bgm455", "bgm456", "bgm457", "bgm458", "bgm459", "bgm460", "bgm461", "bgm462", "bgm463", "bgm464", "bgm465", "bgm466", "bgm467", "bgm468", "bgm469", "bgm470", "bgm471", "bgm472", "bgm473", "bgm474", "bgm475", "bgm476", "bgm477", "bgm478", "bgm479", "bgm480", "bgm481", "bgm482", "bgm483", "bgm484", "bgm485", "bgm486", "bgm487", "bgm488", "bgm489", "bgm490", "bgm491", "bgm492", "bgm493", "bgm494", "bgm495", "bgm496", "bgm497", "bgm498", "bgm499", "bgm500", "bgm501", "bgm502", "bgm503", "bgm504", "bgm505", "bgm506", "bgm507", "bgm508", "bgm509", "bgm510", "bgm511", "bgm512", "bgm513", "bgm514", "bgm515", "bgm516", "bgm517", "bgm518", "bgm519", "bgm520", "bgm521", "bgm522", "bgm523", "bgm524", "bgm525", "bgm526", "bgm527", "bgm528", "bgm529", "bgm530", "bgm531", "bgm532", "bgm533", "bgm534", "bgm535", "bgm536", "bgm537", "bgm538", "bgm539", "bgm540", "bgm541", "bgm542", "bgm543", "bgm544", "bgm545", "bgm546", "bgm547", "bgm548", "bgm549", "bgm550", "bgm551", "bgm552", "bgm553", "bgm554", "bgm555", "bgm556", "bgm557", "bgm558", "bgm559", "bgm560", "bgm561", "bgm562", "bgm563", "bgm564", "bgm565", "bgm566", "bgm567", "bgm568", "bgm569", "bgm570", "bgm571", "bgm572", "bgm573", "bgm574", "bgm575", "bgm576", "bgm577", "bgm578", "bgm579", "bgm580", "bgm581", "bgm582", "bgm583", "bgm584", "bgm585", "bgm586", "bgm587", "bgm588", "bgm589", "bgm590", "bgm591", "bgm592", "bgm593", "bgm594", "bgm595", "bgm596", "bgm597", "bgm598", "bgm599", "bgm600", "bgm601", "bgm602", "bgm603", "bgm604", "bgm605", "bgm606", "bgm607", "bgm608", "bgm609", "bgm610", "bgm611", "bgm612", "bgm613", "bgm614", "bgm615", "bgm616", "bgm617", "bgm618", "bgm619", "bgm620", "bgm621", "bgm622", "bgm623", "bgm624", "bgm625", "bgm626", "bgm627", "bgm628", "bgm629", "bgm630", "bgm631", "bgm632", "bgm633", "bgm634", "bgm635", "bgm636", "bgm637", "bgm638", "bgm639", "bgm640", "bgm641", "bgm642", "bgm643", "bgm644", "bgm645", "bgm646", "bgm647", "bgm648", "bgm649", "bgm650", "bgm651", "bgm652", "bgm653", "bgm654", "bgm655", "bgm656", "bgm657", "bgm658", "bgm659", "bgm660", "bgm661", "bgm662", "bgm663", "bgm664", "bgm665", "bgm666", "bgm667", "bgm668", "bgm669", "bgm670", "bgm671", "bgm672", "bgm673", "bgm674", "bgm675", "bgm676", "bgm677", "bgm678", "bgm679", "bgm680", "bgm681", "bgm682", "bgm683", "bgm684", "bgm685", "bgm686", "bgm687", "bgm688", "bgm689", "bgm690", "bgm691", "bgm692", "bgm693", "bgm694", "bgm695", "bgm696", "bgm697", "bgm698", "bgm699", "bgm700", "bgm701", "bgm702", "bgm703", "bgm704", "bgm705", "bgm706", "bgm707", "bgm708", "bgm709", "bgm710", "bgm711", "bgm712", "bgm713", "bgm714", "bgm715", "bgm716", "bgm717", "bgm718", "bgm719", "bgm720", "bgm721", "bgm722", "bgm723", "bgm724", "bgm725", "bgm726", "bgm727", "bgm728", "bgm729", "bgm730", "bgm731", "bgm732", "bgm733", "bgm734", "bgm735", "bgm736", "bgm737", "bgm738", "bgm739", "bgm740", "bgm741", "bgm742", "bgm743", "bgm744", "bgm745", "bgm746", "bgm747", "bgm748", "bgm749", "bgm750", "bgm751", "bgm752", "bgm753", "bgm754", "bgm755", "bgm756", "bgm757", "bgm758", "bgm759", "bgm760", "bgm761", "bgm762", "bgm763", "bgm764", "bgm765", "bgm766", "bgm767", "bgm768", "bgm769", "bgm770", "bgm771", "bgm772", "bgm773", "bgm774", "bgm775", "bgm776", "bgm777", "bgm778", "bgm779", "bgm780", "bgm781", "bgm782", "bgm783", "bgm784", "bgm785", "bgm786", "bgm787", "bgm788", "bgm789", "bgm790", "bgm791", "bgm792", "bgm793", "bgm794", "bgm795", "bgm796", "bgm797", "bgm798", "bgm799", "bgm800", "bgm801", "bgm802", "bgm803", "bgm804", "bgm805", "bgm806", "bgm807", "bgm808", "bgm809", "bgm810", "bgm811", "bgm812", "bgm813", "bgm814", "bgm815", "bgm816", "bgm817", "bgm818", "bgm819", "bgm820", "bgm821", "bgm822", "bgm823", "bgm824", "bgm825", "bgm826", "bgm827", "bgm828", "bgm829", "bgm830", "bgm831", "bgm832", "bgm833", "bgm834", "bgm835", "bgm836", "bgm837", "bgm838", "bgm839", "bgm840", "bgm841", "bgm842", "bgm843", "bgm844", "bgm845", "bgm846", "bgm847", "bgm848", "bgm849", "bgm850", "bgm851", "bgm852", "bgm853", "bgm854", "bgm855", "bgm856", "bgm857", "bgm858", "bgm859", "bgm860", "bgm861", "bgm862", "bgm863", "bgm864", "bgm865", "bgm866", "bgm867", "bgm868", "bgm869", "bgm870", "bgm871", "bgm872", "bgm873", "bgm874", "bgm875", "bgm876", "bgm877", "bgm878", "bgm879", "bgm880", "bgm881", "bgm882", "bgm883", "bgm884", "bgm885", "bgm886", "bgm887", "bgm888", "bgm889", "bgm890", "bgm891", "bgm892", "bgm893", "bgm894", "bgm895", "bgm896", "bgm897", "bgm898", "bgm899", "bgm900", "bgm901", "bgm902", "bgm903", "bgm904", "bgm905", "bgm906", "bgm907", "bgm908", "bgm909", "bgm910", "bgm911", "bgm912", "bgm913", "bgm914", "bgm915", "bgm916", "bgm917", "bgm918", "bgm919", "bgm920", "bgm921", "bgm922", "bgm923", "bgm924", "bgm925", "bgm926", "bgm927", "bgm928", "bgm929", "bgm930", "bgm931", "bgm932", "bgm933", "bgm934", "bgm935", "bgm936", "bgm937", "bgm938", "bgm939", "bgm940", "bgm941", "bgm942", "bgm943", "bgm944", "bgm945", "bgm946", "bgm947", "bgm948", "bgm949", "bgm950", "bgm951", "bgm952", "bgm953", "bgm954", "bgm955", "bgm956", "bgm957", "bgm958", "bgm959", "bgm960", "bgm961", "bgm962", "bgm963", "bgm964", "bgm965", "bgm966", "bgm967", "bgm968", "bgm969", "bgm970", "bgm971", "bgm972", "bgm973", "bgm974", "bgm975", "bgm976", "bgm977", "bgm978", "bgm979", "bgm980", "bgm981", "bgm982", "bgm983", "bgm984", "bgm985", "bgm986", "bgm987", "bgm988", "bgm989", "bgm990", "bgm991", "bgm992", "bgm993", "bgm994", "bgm995", "bgm996", "bgm997", "bgm998", "bgm999","cancel", "checkpoint", "restart", "win", "message", "again", "stopmusic"];


function directionalRule(rule) {
    for (var i = 0; i < rule.lhs.length; i++) {
        var cellRow = rule.lhs[i];
        if (cellRow.length > 1) {
            return true;
        }
        for (var j = 0; j < cellRow.length; j++) {
            var cell = cellRow[j];
            for (var k = 0; k < cell.length; k += 2) {
                if (relativeDirections.indexOf(cell[k]) >= 0) {
                    return true;
                }
            }
        }
    }
    for (var i = 0; i < rule.rhs.length; i++) {
        var cellRow = rule.rhs[i];
        if (cellRow.length > 1) {
            return true;
        }
        for (var j = 0; j < cellRow.length; j++) {
            var cell = cellRow[j];
            for (var k = 0; k < cell.length; k += 2) {
                if (relativeDirections.indexOf(cell[k]) >= 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function findIndexAfterToken(str, tokens, tokenIndex) {
    str = str.toLowerCase();
    var curIndex = 0;
    for (var i = 0; i <= tokenIndex; i++) {
        var token = tokens[i];
        curIndex = str.indexOf(token, curIndex) + token.length;
    }
    return curIndex;
}
function rightBracketToRightOf(tokens,i){
    for(;i<tokens.length;i++){
        if (tokens[i]==="]"){
            return true;
        }
    }
    return false;
}

function processRuleString(rule, state, curRules) {
    /*

    	intermediate structure
    		dirs: Directions[]
    		pre : CellMask[]
    		post : CellMask[]

    		//pre/post pairs must have same lengths
    	final rule structure
    		dir: Direction
    		pre : CellMask[]
    		post : CellMask[]
    */
    var line = rule[0];
    var lineNumber = rule[1];
    var origLine = rule[2];

    // STEP ONE, TOKENIZE
    line = line.replace(/\[/g, ' [ ').replace(/\]/g, ' ] ').replace(/\|/g, ' | ').replace(/\-\>/g, ' -> ');
    line = line.trim();
    if (line[0] === '+') {
        line = line.substring(0, 1) + " " + line.substring(1, line.length);
    }
    var tokens = line.split(/\s/).filter(function(v) { return v !== '' });

    if (tokens.length == 0) {
        logError('Spooky error!  Empty line passed to rule function.', lineNumber);
    }


    // STEP TWO, READ DIRECTIONS
    /*
    	STATE
    	0 - scanning for initial directions
    	LHS
    	1 - reading cell contents LHS
    	2 - reading cell contents RHS
    */
    var parsestate = 0;
    var directions = [];

    var curcell = null; // [up, cat, down mouse]
    var curcellrow = []; // [  [up, cat]  [ down, mouse ] ]

    var incellrow = false;

    var appendGroup = false;
    var rhs = false;
    var lhs_cells = [];
    var rhs_cells = [];
    var late = false;
    var rigid = false;
    var groupNumber = lineNumber;
    var commands = [];
    var randomRule = false;
	var has_plus = false;

    if (tokens.length === 1) {
        if (tokens[0] === "startloop") {
            rule_line = {
                bracket: 1
            }
            return rule_line;
        } else if (tokens[0] === "endloop") {
            rule_line = {
                bracket: -1
            }
            return rule_line;
        }
    }

    if (tokens.indexOf('->') == -1) {
        logError("A rule has to have an arrow in it.  There's no arrow here! Consider reading up about rules - you're clearly doing something weird", lineNumber);
    }

    var curcell = [];
    var bracketbalance = 0;
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        switch (parsestate) {
            case 0:
                {
                    //read initial directions
                    if (token === '+') {
                        has_plus=true;
                        if (groupNumber === lineNumber) {
                            if (curRules.length == 0) {
                                logError('The "+" symbol, for joining a rule with the group of the previous rule, needs a previous rule to be applied to.', lineNumber);
                            }
                            if (i !== 0) {
                                logError('The "+" symbol, for joining a rule with the group of the previous rule, must be the first symbol on the line ', lineNumber);
                            }
                            groupNumber = curRules[curRules.length - 1].groupNumber;
                        } else {
                            logError('Two "+"s (the "append to previous rule group" symbol) applied to the same rule.', lineNumber);
                        }
                    } else if (token in directionaggregates) {
                        directions = directions.concat(directionaggregates[token]);
                    } else if (token === 'late') {
                        late = true;                        
                    } else if (token === 'rigid') {
                        rigid = true;
                    } else if (token === 'random') {
                        randomRule = true;
                        if (has_plus)
                        {
                            logError(`A rule-group can only be marked random by the opening rule in the group (aka, a '+' and 'random' can't appear as rule modifiers on the same line).  Why? Well, you see "random" isn't a property of individual rules, but of whole rule groups.  It indicates that a single possible application of some rule from the whole group should be applied at random.`, lineNumber) 
                        }

                    } else if (simpleAbsoluteDirections.indexOf(token) >= 0) {
                        directions.push(token);
                    } else if (simpleRelativeDirections.indexOf(token) >= 0) {
                        logError('You cannot use relative directions (\"^v<>\") to indicate in which direction(s) a rule applies.  Use absolute directions indicators (Up, Down, Left, Right, Horizontal, or Vertical, for instance), or, if you want the rule to apply in all four directions, do not specify directions', lineNumber);
                    } else if (token == '[') {
                        if (directions.length == 0) {
                            directions = directions.concat(directionaggregates['orthogonal']);
                        }
                        parsestate = 1;
                        i--;
                    } else {
                        logError("The start of a rule must consist of some number of directions (possibly 0), before the first bracket, specifying in what directions to look (with no direction specified, it applies in all four directions).  It seems you've just entered \"" + token.toUpperCase() + '\".', lineNumber);
                    }
                    break;
                }
            case 1:
                {                                        
                    if (token == '[') {
                        bracketbalance++;
                        if (bracketbalance > 1) {
                            logWarning("Multiple opening brackets without closing brackets.  Something fishy here.  Every '[' has to be closed by a ']', and you can't nest them.", lineNumber);
                        }
                        if (curcell.length > 0) {
                            logError('Error, malformed cell rule - encountered a "["" before previous bracket was closed', lineNumber);
                        }
                        incellrow = true;
                        curcell = [];
                    } else if (reg_directions_only.exec(token)) {
                        if (curcell.length % 2 == 1) {
                            logError("Error, an item can only have one direction/action at a time, but you're looking for several at once!", lineNumber);
                        } else if (!incellrow) {
                            logWarning("Invalid syntax. Directions should be placed at the start of a rule.", lineNumber);
                        } else if (late && token!=='no' && token!=='random' && token!=='randomdir') {
                            logError("Movements cannot appear in late rules.", lineNumber);
                        } else {
                            curcell.push(token);
                        }
                    } else if (token == '|') {
                        if (!incellrow) {
                            logWarning('Janky syntax.  "|" should only be used inside cell rows (the square brackety bits).', lineNumber);
                        } else if (curcell.length % 2 == 1) {
                            logError('In a rule, if you specify a movement, it has to act on an object.', lineNumber);
                        } else {
                            curcellrow.push(curcell);
                            curcell = [];
                        }
                    } else if (token === ']') {

                        bracketbalance--;
                        if (bracketbalance < 0) {
                            logWarning("Multiple closing brackets without corresponding opening brackets.  Something fishy here.  Every '[' has to be closed by a ']', and you can't nest them.", lineNumber);
                        }

                        if (curcell.length % 2 == 1) {
                            if (curcell[0] === '...') {
                                logError('Cannot end a rule with ellipses.', lineNumber);
                            } else {
                                logError('In a rule, if you specify a movement, it has to act on an object.', lineNumber);
                            }
                        } else {
                            curcellrow.push(curcell);
                            curcell = [];
                        }

                        if (rhs) {
                            rhs_cells.push(curcellrow);
                        } else {
                            lhs_cells.push(curcellrow);
                        }
                        curcellrow = [];
                        incellrow = false;
                    } else if (token === '->') {

                        if (groupNumber !== lineNumber) {
                            var parentrule = curRules[curRules.length - 1];
                            if (parentrule.late!==late){
                                logWarning('Oh gosh you can mix late and non-late rules in a rule-group if you really want to, but gosh why would you want to do that?  What do you expect to accomplish?', lineNumber);
                            }
                        }
                        
                        if (incellrow) {
                            logError('Encountered an unexpected "->" inside square brackets.  It\'s used to separate states, it has no place inside them >:| .', lineNumber);
                        } else if (rhs) {
                            logError('Error, you can only use "->" once in a rule; it\'s used to separate before and after states.', lineNumber);
                        } else {
                            rhs = true;
                        }
                    } else if (state.names.indexOf(token) >= 0) {
                        if (!incellrow) {
                            logWarning("Invalid token " + token.toUpperCase() + ". Object names should only be used within cells (square brackets).", lineNumber);
                        } else if (curcell.length % 2 == 0) {
                            curcell.push('');
                            curcell.push(token);
                        } else if (curcell.length % 2 == 1) {
                            curcell.push(token);
                        }
                    } else if (token === '...') {
                        if (!incellrow) {
                            logWarning("Invalid syntax, ellipses should only be used within cells (square brackets).", lineNumber);
                        } else {
                            curcell.push(token);
                            curcell.push(token);
                        }
                    } else if (commandwords.indexOf(token) >= 0) {
                        if (rhs === false) {
                            logError("Commands should only appear at the end of rules, not in or before the pattern-detection/-replacement sections.", lineNumber);
                        } else if (incellrow || rightBracketToRightOf(tokens,i)){//only a warning for legacy support reasons.
                            logWarning("Commands should only appear at the end of rules, not in or before the pattern-detection/-replacement sections.", lineNumber);
                        }
                        if (token === 'message') {
                            var messageIndex = findIndexAfterToken(origLine, tokens, i);
                            var messageStr = origLine.substring(messageIndex).trim();
                            if (messageStr === "") {
                                messageStr = " ";
                                //needs to be nonempty or the system gets confused and thinks it's a whole level message rather than an interstitial.
                            }
                            commands.push([token, messageStr]);
                            i = tokens.length;
                        } else {
                            commands.push([token]);
                        }
                    } else {
                        logError('Error, malformed cell rule - was looking for cell contents, but found "' + token + '".  What am I supposed to do with this, eh, please tell me that.', lineNumber);
                    }
                }

        }
    }

    if (late && rigid){
        logError("Late rules cannot be marked as rigid (rigid rules are all about dealing with the consequences of unresolvable movements, and late rules can't even have movements).", lineNumber);
    }
    
    if (lhs_cells.length != rhs_cells.length) {
        if (commands.length > 0 && rhs_cells.length == 0) {
            //ok
        } else {
            logError('Error, when specifying a rule, the number of matches (square bracketed bits) on the left hand side of the arrow must equal the number on the right', lineNumber);
        }
    } else {
        for (var i = 0; i < lhs_cells.length; i++) {
            if (lhs_cells[i].length != rhs_cells[i].length) {
                logError('In a rule, each pattern to match on the left must have a corresponding pattern on the right of equal length (number of cells).', lineNumber);
                state.invalid=true;
            }
            if (lhs_cells[i].length == 0) {
                logError("You have an totally empty pattern on the left-hand side.  This will match *everything*.  You certainly don't want this.");
            }
        }
    }

    if (lhs_cells.length == 0) {
        logError('This rule refers to nothing.  What the heck? :O', lineNumber);
    }

    var rule_line = {
        directions: directions,
        lhs: lhs_cells,
        rhs: rhs_cells,
        lineNumber: lineNumber,
        late: late,
        rigid: rigid,
        groupNumber: groupNumber,
        commands: commands,
        randomRule: randomRule
    };

    if (directionalRule(rule_line) === false && rule_line.directions.length>1) {
        rule_line.directions.splice(1);
    }

    //next up - replace relative directions with absolute direction

    return rule_line;
}

function deepCloneHS(HS) {
    var cloneHS = HS.map(function(arr) { return arr.map(function(deepArr) { return deepArr.slice(); }); });
    return cloneHS;
}

function deepCloneRule(rule) {
    var clonedRule = {
        direction: rule.direction,
        lhs: deepCloneHS(rule.lhs),
        rhs: deepCloneHS(rule.rhs),
        lineNumber: rule.lineNumber,
        late: rule.late,
        rigid: rule.rigid,
        groupNumber: rule.groupNumber,
        commands: rule.commands,
        randomRule: rule.randomRule
    };
    return clonedRule;
}

function rulesToArray(state) {
    var oldrules = state.rules;
    var rules = [];
    var loops = [];
    for (var i = 0; i < oldrules.length; i++) {
        var lineNumber = oldrules[i][1];
        var newrule = processRuleString(oldrules[i], state, rules);
        if (newrule.bracket !== undefined) {
            loops.push([lineNumber, newrule.bracket]);
            continue;
        }
        rules.push(newrule);
    }
    state.loops = loops;

    //now expand out rules with multiple directions
    var rules2 = [];
    for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        var ruledirs = rule.directions;
        for (var j = 0; j < ruledirs.length; j++) {
            var dir = ruledirs[j];
            if (dir in directionaggregates && directionalRule(rule)) {
                var dirs = directionaggregates[dir];
                for (var k = 0; k < dirs.length; k++) {
                    var modifiedrule = deepCloneRule(rule);
                    modifiedrule.direction = dirs[k];
                    rules2.push(modifiedrule);
                }
            } else {
                var modifiedrule = deepCloneRule(rule);
                modifiedrule.direction = dir;
                rules2.push(modifiedrule);
            }
        }
    }

    for (var i = 0; i < rules2.length; i++) {
        var rule = rules2[i];
        //remove relative directions
        convertRelativeDirsToAbsolute(rule);
        //optional: replace up/left rules with their down/right equivalents
        rewriteUpLeftRules(rule);
        //replace aggregates with what they mean
        atomizeAggregates(state, rule);

        if (state.invalid){
            return;
        }
        
        //replace synonyms with what they mean
        rephraseSynonyms(state, rule);
    }

    var rules3 = [];
    //expand property rules
    for (var i = 0; i < rules2.length; i++) {
        var rule = rules2[i];
        rules3 = rules3.concat(concretizeMovingRule(state, rule, rule.lineNumber));
    }

    var rules4 = [];
    for (var i = 0; i < rules3.length; i++) {
        var rule = rules3[i];
        rules4 = rules4.concat(concretizePropertyRule(state, rule, rule.lineNumber));

    }

    for (var i=0;i<rules4.length;i++){
        makeSpawnedObjectsStationary(state,rules4[i],rule.lineNumber);
    }
    state.rules = rules4;
}

function containsEllipsis(rule) {
    for (var i = 0; i < rule.lhs.length; i++) {
        for (var j = 0; j < rule.lhs[i].length; j++) {
            if (rule.lhs[i][j][1] === '...')
                return true;
        }
    }
    return false;
}

function rewriteUpLeftRules(rule) {
    if (containsEllipsis(rule)) {
        return;
    }

    if (rule.direction == 'up') {
        rule.direction = 'down';
    } else if (rule.direction == 'left') {
        rule.direction = 'right';
    } else {
        return;
    }

    for (var i = 0; i < rule.lhs.length; i++) {
        rule.lhs[i].reverse();
        if (rule.rhs.length > 0) {
            rule.rhs[i].reverse();
        }
    }
}

//expands all properties to list of all things it could be, filterio
function getPossibleObjectsFromCell(state, cell) {
    var result = [];
    for (var j = 0; j < cell.length; j += 2) {
        var dir = cell[j];
        var name = cell[j + 1];
        if (name in state.objects){
            result.push(name);
        }
        else if (name in state.propertiesDict) {
            var aliases = state.propertiesDict[name];
            for (var k = 0; k < aliases.length; k++) {
                var alias = aliases[k];
                result.push(alias);
            }        
        }
    }
    return result;
}

function getPropertiesFromCell(state, cell) {
    var result = [];
    for (var j = 0; j < cell.length; j += 2) {
        var dir = cell[j];
        var name = cell[j + 1];
        if (dir == "random") {
            continue;
        }
        if (name in state.propertiesDict) {
            result.push(name);
        }
    }
    return result;
}

//returns you a list of object names in that cell that're moving
function getMovings(state, cell) {
    var result = [];
    for (var j = 0; j < cell.length; j += 2) {
        var dir = cell[j];
        var name = cell[j + 1];
        if (dir in directionaggregates) {
            result.push([name, dir]);
        }
    }
    return result;
}

function concretizePropertyInCell(cell, property, concreteType) {
    for (var j = 0; j < cell.length; j += 2) {
        if (cell[j + 1] === property && cell[j] !== "random") {
            cell[j + 1] = concreteType;
        }
    }
}

function concretizeMovingInCell(cell, ambiguousMovement, nameToMove, concreteDirection) {
    for (var j = 0; j < cell.length; j += 2) {
        if (cell[j] === ambiguousMovement && cell[j + 1] === nameToMove) {
            cell[j] = concreteDirection;
        }
    }
}

function concretizeMovingInCellByAmbiguousMovementName(cell, ambiguousMovement, concreteDirection) {
    for (var j = 0; j < cell.length; j += 2) {
        if (cell[j] === ambiguousMovement) {
            cell[j] = concreteDirection;
        }
    }
}

function expandNoPrefixedProperties(state, cell) {
    var expanded = [];
    for (var i = 0; i < cell.length; i += 2) {
        var dir = cell[i];
        var name = cell[i + 1];

        if (dir === 'no' && (name in state.propertiesDict)) {
            var aliases = state.propertiesDict[name];
            for (var j = 0; j < aliases.length; j++) {
                var alias = aliases[j];
                expanded.push(dir);
                expanded.push(alias);
            }
        } else {
            expanded.push(dir);
            expanded.push(name);
        }
    }
    return expanded;
}

function concretizePropertyRule(state, rule, lineNumber) {

    //step 1, rephrase rule to change "no flying" to "no cat no bat"
    for (var i = 0; i < rule.lhs.length; i++) {
        var cur_cellrow_l = rule.lhs[i];
        for (var j = 0; j < cur_cellrow_l.length; j++) {
            cur_cellrow_l[j] = expandNoPrefixedProperties(state, cur_cellrow_l[j]);
            if (rule.rhs.length > 0)
                rule.rhs[i][j] = expandNoPrefixedProperties(state, rule.rhs[i][j]);
        }
    }

    //are there any properties we could avoid processing?
    // e.g. [> player | movable] -> [> player | > movable],
    // 		doesn't need to be split up (assuming single-layer player/block aggregates)

    // we can't manage this if they're being used to disambiguate
    var ambiguousProperties = {};

    for (var j = 0; j < rule.rhs.length; j++) {
        var row_l = rule.lhs[j];
        var row_r = rule.rhs[j];
        for (var k = 0; k < row_r.length; k++) {
            var properties_l = getPropertiesFromCell(state, row_l[k]);
            var properties_r = getPropertiesFromCell(state, row_r[k]);
            for (var prop_n = 0; prop_n < properties_r.length; prop_n++) {
                var property = properties_r[prop_n];
                if (properties_l.indexOf(property) == -1) {
                    ambiguousProperties[property] = true;
                }
            }
        }
    }

    var shouldremove;
    var result = [rule];
    var modified = true;
    while (modified) {
        modified = false;
        for (var i = 0; i < result.length; i++) {
            //only need to iterate through lhs
            var cur_rule = result[i];
            shouldremove = false;
            for (var j = 0; j < cur_rule.lhs.length && !shouldremove; j++) {
                var cur_rulerow = cur_rule.lhs[j];
                for (var k = 0; k < cur_rulerow.length && !shouldremove; k++) {
                    var cur_cell = cur_rulerow[k];
                    var properties = getPropertiesFromCell(state, cur_cell);
                    for (var prop_n = 0; prop_n < properties.length; ++prop_n) {
                        var property = properties[prop_n];

                        if (state.propertiesSingleLayer.hasOwnProperty(property) &&
                            ambiguousProperties[property] !== true) {
                            // we don't need to explode this property
                            continue;
                        }

                        var aliases = state.propertiesDict[property];

                        shouldremove = true;
                        modified = true;

                        //just do the base property, let future iterations take care of the others

                        for (var l = 0; l < aliases.length; l++) {
                            var concreteType = aliases[l];
                            var newrule = deepCloneRule(cur_rule);
                            newrule.propertyReplacement = {};
                            for (var prop in cur_rule.propertyReplacement) {
                                if (cur_rule.propertyReplacement.hasOwnProperty(prop)) {
                                    var propDat = cur_rule.propertyReplacement[prop];
                                    newrule.propertyReplacement[prop] = [propDat[0], propDat[1]];
                                }
                            }

                            concretizePropertyInCell(newrule.lhs[j][k], property, concreteType);
                            if (newrule.rhs.length > 0) {
                                concretizePropertyInCell(newrule.rhs[j][k], property, concreteType); //do for the corresponding rhs cell as well
                            }

                            if (newrule.propertyReplacement[property] === undefined) {
                                newrule.propertyReplacement[property] = [concreteType, 1];
                            } else {
                                newrule.propertyReplacement[property][1] = newrule.propertyReplacement[property][1] + 1;
                            }

                            result.push(newrule);
                        }

                        break;
                    }
                }
            }
            if (shouldremove) {
                result.splice(i, 1);
                i--;
            }
        }
    }


    for (var i = 0; i < result.length; i++) {
        //for each rule
        var cur_rule = result[i];
        if (cur_rule.propertyReplacement === undefined) {
            continue;
        }

        //for each property replacement in that rule
        for (var property in cur_rule.propertyReplacement) {
            if (cur_rule.propertyReplacement.hasOwnProperty(property)) {
                var replacementInfo = cur_rule.propertyReplacement[property];
                var concreteType = replacementInfo[0];
                var occurrenceCount = replacementInfo[1];
                if (occurrenceCount === 1) {
                    //do the replacement
                    for (var j = 0; j < cur_rule.rhs.length; j++) {
                        var cellRow_rhs = cur_rule.rhs[j];
                        for (var k = 0; k < cellRow_rhs.length; k++) {
                            var cell = cellRow_rhs[k];
                            concretizePropertyInCell(cell, property, concreteType);
                        }
                    }
                }
            }
        }
    }

    //if any properties remain on the RHSes, bleep loudly
    var rhsPropertyRemains = '';
    for (var i = 0; i < result.length; i++) {
        var cur_rule = result[i];
        delete result.propertyReplacement;
        for (var j = 0; j < cur_rule.rhs.length; j++) {
            var cur_rulerow = cur_rule.rhs[j];
            for (var k = 0; k < cur_rulerow.length; k++) {
                var cur_cell = cur_rulerow[k];
                var properties = getPropertiesFromCell(state, cur_cell);
                for (var prop_n = 0; prop_n < properties.length; prop_n++) {
                    if (ambiguousProperties.hasOwnProperty(properties[prop_n])) {
                        rhsPropertyRemains = properties[prop_n];
                    }
                }
            }
        }
    }


    if (rhsPropertyRemains.length > 0) {
        logError('This rule has a property on the right-hand side, \"' + rhsPropertyRemains.toUpperCase() + "\", that can't be inferred from the left-hand side.  (either for every property on the right there has to be a corresponding one on the left in the same cell, OR, if there's a single occurrence of a particular property name on the left, all properties of the same name on the right are assumed to be the same).", lineNumber);
        return [];
    }

    return result;
}

function makeSpawnedObjectsStationary(state,rule,lineNumber){
    //movement not getting correctly cleared from tile #492
    //[ > Player | ] -> [ Crate | Player ] if there was a player already in the second cell, it's not replaced with a stationary player.
    //if there are properties remaining by this stage, just ignore them ( c.f. "[ >  Moveable | Moveable ] -> [ > Moveable | > Moveable ]" in block faker, what's left in this form) - this only happens IIRC when the properties span a single layer so it's)
    //if am object without moving-annotations appears on the RHS, and that object is not present on the lhs (either explicitly as an object, or implicitly in a property), add a 'stationary'
    if (rule.late){
        return;
    }

    for (var j = 0; j < rule.rhs.length; j++) {
        var row_l = rule.lhs[j];
        var row_r = rule.rhs[j];
        for (var k = 0; k < row_r.length; k++) {
            var cell=row_r[k];

            //this is super intricate. uff. 
            var objects_l = getPossibleObjectsFromCell(state, row_l[k]);
            var layers = objects_l.map(n=>state.objects[n].layer);
            for (var l = 0; l < cell.length; l += 2) {
                var dir = cell[l];
                if (dir!==""){
                    continue;
                }
                var name = cell[l + 1];
                if (name in state.propertiesDict || objects_l.indexOf(name)>=0){
                    continue;
                }
                var r_layer = state.objects[name].layer;
                if (layers.indexOf(r_layer)===-1){
                    cell[l]='stationary';
                }
            }
        }
    }

}

function concretizeMovingRule(state, rule, lineNumber) {

    var shouldremove;
    var result = [rule];
    var modified = true;
    while (modified) {
        modified = false;
        for (var i = 0; i < result.length; i++) {
            //only need to iterate through lhs
            var cur_rule = result[i];
            shouldremove = false;
            for (var j = 0; j < cur_rule.lhs.length; j++) {
                var cur_rulerow = cur_rule.lhs[j];
                for (var k = 0; k < cur_rulerow.length; k++) {
                    var cur_cell = cur_rulerow[k];
                    var movings = getMovings(state, cur_cell); //finds aggregate directions
                    if (movings.length > 0) {
                        shouldremove = true;
                        modified = true;

                        //just do the base property, let future iterations take care of the others
                        var cand_name = movings[0][0];
                        var ambiguous_dir = movings[0][1];
                        var concreteDirs = directionaggregates[ambiguous_dir];
                        for (var l = 0; l < concreteDirs.length; l++) {
                            var concreteDirection = concreteDirs[l];
                            var newrule = deepCloneRule(cur_rule);

                            //deep copy replacements
                            newrule.movingReplacement = {};
                            for (var moveTerm in cur_rule.movingReplacement) {
                                if (cur_rule.movingReplacement.hasOwnProperty(moveTerm)) {
                                    var moveDat = cur_rule.movingReplacement[moveTerm];
                                    newrule.movingReplacement[moveTerm] = [moveDat[0], moveDat[1], moveDat[2],moveDat[3],moveDat[4],moveDat[5]];
                                }
                            }
                            newrule.aggregateDirReplacement = {};
                            for (var moveTerm in cur_rule.aggregateDirReplacement) {
                                if (cur_rule.aggregateDirReplacement.hasOwnProperty(moveTerm)) {
                                    var moveDat = cur_rule.aggregateDirReplacement[moveTerm];
                                    newrule.aggregateDirReplacement[moveTerm] = [moveDat[0], moveDat[1], moveDat[2]];
                                }                                
                            }

                            concretizeMovingInCell(newrule.lhs[j][k], ambiguous_dir, cand_name, concreteDirection);
                            if (newrule.rhs.length > 0) {
                                concretizeMovingInCell(newrule.rhs[j][k], ambiguous_dir, cand_name, concreteDirection); //do for the corresponding rhs cell as well
                            }

                            if (newrule.movingReplacement[cand_name+ambiguous_dir] === undefined) {
                                newrule.movingReplacement[cand_name+ambiguous_dir] = [concreteDirection, 1, ambiguous_dir,cand_name,j,k];
                            } else {
                                var mr = newrule.movingReplacement[cand_name+ambiguous_dir];
                                if (j!==mr[4] || k!==mr[5]){
                                    mr[1] = mr[1] + 1;
                                }
                            }
                            if (newrule.aggregateDirReplacement[ambiguous_dir] === undefined) {
                                newrule.aggregateDirReplacement[ambiguous_dir] = [concreteDirection, 1, ambiguous_dir];
                            } else {
                                newrule.aggregateDirReplacement[ambiguous_dir][1] = newrule.aggregateDirReplacement[ambiguous_dir][1] + 1;
                            }

                            result.push(newrule);
                        }
                    }
                }
            }
            if (shouldremove) {
                result.splice(i, 1);
                i--;
            }
        }
    }


    for (var i = 0; i < result.length; i++) {
        //for each rule
        var cur_rule = result[i];
        if (cur_rule.movingReplacement === undefined) {
            continue;
        }
        var ambiguous_movement_dict = {};
        //strict first - matches movement direction to objects
        //for each property replacement in that rule
        for (var cand_name in cur_rule.movingReplacement) {
            if (cur_rule.movingReplacement.hasOwnProperty(cand_name)) {
                var replacementInfo = cur_rule.movingReplacement[cand_name];
                var concreteMovement = replacementInfo[0];
                var occurrenceCount = replacementInfo[1];
                var ambiguousMovement = replacementInfo[2];
                var ambiguousMovement_attachedObject = replacementInfo[3];

                if (occurrenceCount === 1) {
                    //do the replacement
                    for (var j = 0; j < cur_rule.rhs.length; j++) {
                        var cellRow_rhs = cur_rule.rhs[j];
                        for (var k = 0; k < cellRow_rhs.length; k++) {
                            var cell = cellRow_rhs[k];
                            concretizeMovingInCell(cell, ambiguousMovement, ambiguousMovement_attachedObject, concreteMovement);
                        }
                    }
                }

            }
        }

        //I don't fully understand why the following part is needed (and I wrote this yesterday), but it's not obviously malicious.
        var ambiguous_movement_names_dict = {};
        for (var cand_name in cur_rule.aggregateDirReplacement) {
            if (cur_rule.aggregateDirReplacement.hasOwnProperty(cand_name)) {
                var replacementInfo = cur_rule.aggregateDirReplacement[cand_name];
                var concreteMovement = replacementInfo[0];
                var occurrenceCount = replacementInfo[1];
                var ambiguousMovement = replacementInfo[2];
                //are both the following boolean bits necessary, or just the latter? ah well, no harm it seems.
                if ((ambiguousMovement in ambiguous_movement_names_dict) || (occurrenceCount !== 1)) {
                    ambiguous_movement_names_dict[ambiguousMovement] = "INVALID";
                } else {
                    ambiguous_movement_names_dict[ambiguousMovement] = concreteMovement
                }
            }
        }        

        //for each ambiguous word, if there's a single ambiguous movement specified in the whole lhs, then replace that wholesale
        for (var ambiguousMovement in ambiguous_movement_dict) {
            if (ambiguous_movement_dict.hasOwnProperty(ambiguousMovement) && ambiguousMovement !== "INVALID") {
                concreteMovement = ambiguous_movement_dict[ambiguousMovement];
                if (concreteMovement === "INVALID") {
                    continue;
                }
                for (var j = 0; j < cur_rule.rhs.length; j++) {
                    var cellRow_rhs = cur_rule.rhs[j];
                    for (var k = 0; k < cellRow_rhs.length; k++) {
                        var cell = cellRow_rhs[k];
                        concretizeMovingInCellByAmbiguousMovementName(cell, ambiguousMovement, concreteMovement);
                    }
                }
            }
        }

        
        //further replacements - if a movement word appears once on the left, can use to disambiguate remaining ones on the right
        for (var ambiguousMovement in ambiguous_movement_names_dict) {
            if (ambiguous_movement_names_dict.hasOwnProperty(ambiguousMovement) && ambiguousMovement !== "INVALID") {
                concreteMovement = ambiguous_movement_names_dict[ambiguousMovement];
                if (concreteMovement === "INVALID") {
                    continue;
                }
                for (var j = 0; j < cur_rule.rhs.length; j++) {
                    var cellRow_rhs = cur_rule.rhs[j];
                    for (var k = 0; k < cellRow_rhs.length; k++) {
                        var cell = cellRow_rhs[k];
                        concretizeMovingInCellByAmbiguousMovementName(cell, ambiguousMovement, concreteMovement);
                    }
                }
            }
        }
    }

    //if any properties remain on the RHSes, bleep loudly
    var rhsAmbiguousMovementsRemain = '';
    for (var i = 0; i < result.length; i++) {
        var cur_rule = result[i];
        delete result.movingReplacement;
        for (var j = 0; j < cur_rule.rhs.length; j++) {
            var cur_rulerow = cur_rule.rhs[j];
            for (var k = 0; k < cur_rulerow.length; k++) {
                var cur_cell = cur_rulerow[k];
                var movings = getMovings(state, cur_cell);
                if (movings.length > 0) {
                    rhsAmbiguousMovementsRemain = movings[0][1];
                }
            }
        }
    }


    if (rhsAmbiguousMovementsRemain.length > 0) {
        logError('This rule has an ambiguous movement on the right-hand side, \"' + rhsAmbiguousMovementsRemain + "\", that can't be inferred from the left-hand side.  (either for every ambiguous movement associated to an entity on the right there has to be a corresponding one on the left attached to the same entity, OR, if there's a single occurrence of a particular ambiguous movement on the left, all properties of the same movement attached to the same object on the right are assumed to be the same (or something like that)).", lineNumber);
        state.invalid=true;
    }

    return result;
}

function rephraseSynonyms(state, rule) {
    for (var i = 0; i < rule.lhs.length; i++) {
        var cellrow_l = rule.lhs[i];
        var cellrow_r = rule.rhs[i];
        for (var j = 0; j < cellrow_l.length; j++) {
            var cell_l = cellrow_l[j];
            for (var k = 1; k < cell_l.length; k += 2) {
                var name = cell_l[k];
                if (name in state.synonymsDict) {
                    cell_l[k] = state.synonymsDict[cell_l[k]];
                }
            }
            if (rule.rhs.length > 0) {
                var cell_r = cellrow_r[j];
                for (var k = 1; k < cell_r.length; k += 2) {
                    var name = cell_r[k];
                    if (name in state.synonymsDict) {
                        cell_r[k] = state.synonymsDict[cell_r[k]];
                    }
                }
            }
        }
    }
}

function atomizeAggregates(state, rule) {
    for (var i = 0; i < rule.lhs.length; i++) {
        var cellrow = rule.lhs[i];
        for (var j = 0; j < cellrow.length; j++) {
            var cell = cellrow[j];
            atomizeCellAggregates(state, cell, rule.lineNumber);
        }
    }
    for (var i = 0; i < rule.rhs.length; i++) {
        var cellrow = rule.rhs[i];
        for (var j = 0; j < cellrow.length; j++) {
            var cell = cellrow[j];
            atomizeCellAggregates(state, cell, rule.lineNumber);
        }
    }
}

function atomizeCellAggregates(state, cell, lineNumber) {
    for (var i = 0; i < cell.length; i += 2) {
        var dir = cell[i];
        var c = cell[i + 1];
        if (c in state.aggregatesDict) {
            if (dir === 'no') {
                logError("You cannot use 'no' to exclude the aggregate object " + c.toUpperCase() + " (defined using 'AND'), only regular objects, or properties (objects defined using 'OR').  If you want to do this, you'll have to write it out yourself the long way.", lineNumber);
            }
            var equivs = state.aggregatesDict[c];
            cell[i + 1] = equivs[0];
            for (var j = 1; j < equivs.length; j++) {
                cell.push(cell[i]); //push the direction
                cell.push(equivs[j]);
            }
        }
    }
}

function convertRelativeDirsToAbsolute(rule) {
    var forward = rule.direction;
    for (var i = 0; i < rule.lhs.length; i++) {
        var cellrow = rule.lhs[i];
        for (var j = 0; j < cellrow.length; j++) {
            var cell = cellrow[j];
            absolutifyRuleCell(forward, cell);
        }
    }
    for (var i = 0; i < rule.rhs.length; i++) {
        var cellrow = rule.rhs[i];
        for (var j = 0; j < cellrow.length; j++) {
            var cell = cellrow[j];
            absolutifyRuleCell(forward, cell);
        }
    }
}

var relativeDirs = ['^', 'v', '<', '>', 'parallel', 'perpendicular']; //used to index the following
//I use _par/_perp just to keep track of providence for replacement purposes later.
var relativeDict = {
    'right': ['up', 'down', 'left', 'right', 'horizontal_par', 'vertical_perp'],
    'up': ['left', 'right', 'down', 'up', 'vertical_par', 'horizontal_perp'],
    'down': ['right', 'left', 'up', 'down', 'vertical_par', 'horizontal_perp'],
    'left': ['down', 'up', 'right', 'left', 'horizontal_par', 'vertical_perp']
};

function absolutifyRuleCell(forward, cell) {
    for (var i = 0; i < cell.length; i += 2) {
        var c = cell[i];
        var index = relativeDirs.indexOf(c);
        if (index >= 0) {
            cell[i] = relativeDict[forward][index];
        }
    }
}
/*
	direction mask
	UP parseInt('%1', 2);
	DOWN parseInt('0', 2);
	LEFT parseInt('0', 2);
	RIGHT parseInt('0', 2);
	?  parseInt('', 2);

*/

var dirMasks = {
    'up': parseInt('00001', 2),
    'down': parseInt('00010', 2),
    'left': parseInt('00100', 2),
    'right': parseInt('01000', 2),
    'moving': parseInt('01111', 2),
    'no': parseInt('00011', 2),
    'randomdir': parseInt('00101', 2),
    'random': parseInt('10010', 2),
    'action': parseInt('10000', 2),
    '': parseInt('00000', 2)
};

function rulesToMask(state) {
    /*

    */
    var layerCount = state.collisionLayers.length;
    var layerTemplate = [];
    for (var i = 0; i < layerCount; i++) {
        layerTemplate.push(null);
    }

    for (var i = 0; i < state.rules.length; i++) {
        var rule = state.rules[i];
        for (var j = 0; j < rule.lhs.length; j++) {
            var cellrow_l = rule.lhs[j];
            var cellrow_r = rule.rhs[j];
            for (var k = 0; k < cellrow_l.length; k++) {
                var cell_l = cellrow_l[k];
                var layersUsed_l = layerTemplate.concat([]);
                var objectsPresent = new BitVec(STRIDE_OBJ);
                var objectsMissing = new BitVec(STRIDE_OBJ);
                var anyObjectsPresent = [];
                var movementsPresent = new BitVec(STRIDE_MOV);
                var movementsMissing = new BitVec(STRIDE_MOV);

                var objectlayers_l = new BitVec(STRIDE_MOV);
                for (var l = 0; l < cell_l.length; l += 2) {
                    var object_dir = cell_l[l];
                    if (object_dir === '...') {
                        objectsPresent = ellipsisPattern;
                        if (cell_l.length !== 2) {
                            logError("You can't have anything in with an ellipsis. Sorry.", rule.lineNumber);
                            throw 'aborting compilation';//throwing here because I was getting infinite loops in the compiler otherwise
                        } else if ((k === 0) || (k === cellrow_l.length - 1)) {
                            logError("There's no point in putting an ellipsis at the very start or the end of a rule", rule.lineNumber);
                        } else if (rule.rhs.length > 0) {
                            var rhscell = cellrow_r[k];
                            if (rhscell.length !== 2 || rhscell[0] !== '...') {
                                logError("An ellipsis on the left must be matched by one in the corresponding place on the right.", rule.lineNumber);
                            }
                        }
                        break;
                    } else if (object_dir === 'random') {
                        logError("RANDOM cannot be matched on the left-hand side, it can only appear on the right", rule.lineNumber);
                        continue;
                    }

                    var object_name = cell_l[l + 1];
                    var object = state.objects[object_name];
                    var objectMask = state.objectMasks[object_name];
                    if (object) {
                        var layerIndex = object.layer | 0;
                    } else {
                        var layerIndex = state.propertiesSingleLayer[object_name];
                    }

                    if (typeof(layerIndex) === "undefined") {
                        logError("Oops!  " + object_name.toUpperCase() + " not assigned to a layer.", rule.lineNumber);
                    }

                    if (object_dir === 'no') {
                        objectsMissing.ior(objectMask);
                    } else {
                        var existingname = layersUsed_l[layerIndex];
                        if (existingname !== null) {
                            rule.discard=[object_name.toUpperCase(), existingname.toUpperCase()];
                        }

                        layersUsed_l[layerIndex] = object_name;

                        if (object) {
                            objectsPresent.ior(objectMask);
                            objectlayers_l.ishiftor(0x1f, 5 * layerIndex);
                        } else {
                            anyObjectsPresent.push(objectMask);
                        }

                        if (object_dir === 'stationary') {
                            movementsMissing.ishiftor(0x1f, 5 * layerIndex);
                        } else {
                            movementsPresent.ishiftor(dirMasks[object_dir], 5 * layerIndex);
                        }
                    }
                }

                if (rule.rhs.length > 0) {
                    var rhscell = cellrow_r[k];
                    var lhscell = cellrow_l[k];
                    if (rhscell[0] === '...' && lhscell[0] !== '...') {
                        logError("An ellipsis on the right must be matched by one in the corresponding place on the left.", rule.lineNumber);
                    }
                    for (var l = 0; l < rhscell.length; l += 2) {
                        var content = rhscell[l];
                        if (content === '...') {
                            if (rhscell.length !== 2) {
                                logError("You can't have anything in with an ellipsis. Sorry.", rule.lineNumber);
                            }
                        }
                    }
                }

                if (objectsPresent === ellipsisPattern) {
                    cellrow_l[k] = ellipsisPattern;
                    continue;
                } else {
                    cellrow_l[k] = new CellPattern([objectsPresent, objectsMissing, anyObjectsPresent, movementsPresent, movementsMissing, null]);
                }

                //if X no X, then cancel
                if (objectsPresent.anyBitsInCommon(objectsMissing)){
                    //if I'm about the remove the last representative of this line number, throw an error
                    var ln = rule.lineNumber;
                    if ( (i>0 && state.rules[i-1].lineNumber===ln) || ( (i+1<state.rules.length) && state.rules[i+1].lineNumber===ln)){
                        //all good
                    } else {
                        logWarning('This rule has some content of the form "X no X" (either directly or maybe indirectly - check closely how the terms are defined if nothing stands out) which can never match and so the rule is getting removed during compilation.', rule.lineNumber);
                    }
                    state.rules.splice(i,1);
                    i--;
                    continue;
                }
                
                if (rule.rhs.length === 0) {
                    continue;
                }

                var cell_r = cellrow_r[k];
                var layersUsed_r = layerTemplate.concat([]);
                var layersUsedRand_r = layerTemplate.concat([]);

                var objectsClear = new BitVec(STRIDE_OBJ);
                var objectsSet = new BitVec(STRIDE_OBJ);
                var movementsClear = new BitVec(STRIDE_MOV);
                var movementsSet = new BitVec(STRIDE_MOV);

                var objectlayers_r = new BitVec(STRIDE_MOV);
                var randomMask_r = new BitVec(STRIDE_OBJ);
                var postMovementsLayerMask_r = new BitVec(STRIDE_MOV);
                var randomDirMask_r = new BitVec(STRIDE_MOV);
                for (var l = 0; l < cell_r.length; l += 2) {
                    var object_dir = cell_r[l];
                    var object_name = cell_r[l + 1];

                    if (object_dir === '...') {
                        //logError("spooky ellipsis found! (should never hit this)");
                        break;
                    } else if (object_dir === 'random') {
                        if (object_name in state.objectMasks) {
                            var mask = state.objectMasks[object_name];
                            randomMask_r.ior(mask);
                            var values;
                            if (state.propertiesDict.hasOwnProperty(object_name)) {
                                values = state.propertiesDict[object_name];
                            } else {
                                //get line number declaration of object_name
                                logWarning(`In this rule you're asking me to spawn a random ${object_name.toUpperCase()} for you, but that's already a concrete single object.  You wanna be using random with properties (things defined in terms of OR in the legend) so there's some things to select between.`, rule.lineNumber);
                                values = [object_name];
                            }
                            for (var m = 0; m < values.length; m++) {
                                var subobject = values[m];
                                var layerIndex = state.objects[subobject].layer | 0;
                                var existingname = layersUsed_r[layerIndex];
                                if (existingname !== null) {
                                    var o1 = subobject.toUpperCase();
                                    var o2 = existingname.toUpperCase();
                                    if (o1 !== o2) {
                                        logWarning("This rule may try to spawn a " + o1 + " with random, but also requires a " + o2 + " be here, which is on the same layer - they shouldn't be able to coexist!", rule.lineNumber);
                                    }
                                }

                                layersUsedRand_r[layerIndex] = subobject;
                            }

                        } else {
                            logError('You want to spawn a random "' + object_name.toUpperCase() + '", but I don\'t know how to do that', rule.lineNumber);
                        }
                        continue;
                    }

                    var object = state.objects[object_name];
                    var objectMask = state.objectMasks[object_name];
                    if (object) {
                        var layerIndex = object.layer | 0;
                    } else {
                        var layerIndex = state.propertiesSingleLayer[object_name];
                    }


                    if (object_dir == 'no') {
                        objectsClear.ior(objectMask);
                    } else {
                        var existingname = layersUsed_r[layerIndex];
                        if (existingname === null) {
                            existingname = layersUsedRand_r[layerIndex];
                        }

                        if (existingname !== null) {
                            if (rule.hasOwnProperty('discard')) {

                            } else {
                                logError('Rule matches object types that can\'t overlap: "' + object_name.toUpperCase() + '" and "' + existingname.toUpperCase() + '".', rule.lineNumber);
                            }
                        }

                        layersUsed_r[layerIndex] = object_name;

                        if (object_dir.length > 0) {
                            postMovementsLayerMask_r.ishiftor(0x1f, 5 * layerIndex);
                        }

                        var layerMask = state.layerMasks[layerIndex];

                        if (object) {
                            objectsSet.ibitset(object.id);
                            objectsClear.ior(layerMask);
                            objectlayers_r.ishiftor(0x1f, 5 * layerIndex);
                        } else {
                            // shouldn't need to do anything here...
                        }
                        //possibility - if object not present on lhs in same position, clear movement
                        if (object_dir === 'stationary') {
                            movementsClear.ishiftor(0x1f, 5 * layerIndex);
                        }                
                        if (object_dir === 'randomdir') {
                            randomDirMask_r.ishiftor(dirMasks[object_dir], 5 * layerIndex);
                        } else {
                            movementsSet.ishiftor(dirMasks[object_dir], 5 * layerIndex);
                        };
                    }
                }

                //I don't know why these two ifs here are needed.
                if (!(objectsPresent.bitsSetInArray(objectsSet.data))) {
                    objectsClear.ior(objectsPresent); // clear out old objects
                }
                if (!(movementsPresent.bitsSetInArray(movementsSet.data))) {
                    movementsClear.ior(movementsPresent); // ... and movements
                }

                /*
                for rules like this I want to clear movements on newly-spawned entities
                    [ >  Player | Crate ] -> [  >  Player | > Crate  ]
                    [ > Player | ] -> [ Crate | Player ]

                WITHOUT havin this rule remove movements
                    [ > Player | ] -> [ Crate | Player ]
                (bug #492)
                */
               
                for (var l = 0; l < layerCount; l++) {
                    if (layersUsed_l[l] !== null && layersUsed_r[l] === null) {
                        // a layer matched on the lhs, but not on the rhs
                        objectsClear.ior(state.layerMasks[l]);
                        postMovementsLayerMask_r.ishiftor(0x1f, 5 * l);
                    }
                }

                objectlayers_l.iclear(objectlayers_r);

                postMovementsLayerMask_r.ior(objectlayers_l);
                if (!objectsClear.iszero() || !objectsSet.iszero() || !movementsClear.iszero() || !movementsSet.iszero() || !postMovementsLayerMask_r.iszero() || !randomMask_r.iszero() || !randomDirMask_r.iszero()) {
                    // only set a replacement if something would change
                    cellrow_l[k].replacement = new CellReplacement([objectsClear, objectsSet, movementsClear, movementsSet, postMovementsLayerMask_r, randomMask_r, randomDirMask_r]);
                } 
            }
        }
    }
}

function cellRowMasks(rule) {
    var ruleMasks = [];
    var lhs = rule[1];
    for (var i = 0; i < lhs.length; i++) {
        var cellRow = lhs[i];
        var rowMask = new BitVec(STRIDE_OBJ);
        for (var j = 0; j < cellRow.length; j++) {
            if (cellRow[j] === ellipsisPattern)
                continue;
            rowMask.ior(cellRow[j].objectsPresent);
        }
        ruleMasks.push(rowMask);
    }
    return ruleMasks;
}

function cellRowMasks_Movements(rule){
    var ruleMasks_mov = [];
    var lhs = rule[1];
    for (var i = 0; i < lhs.length; i++) {
        var cellRow = lhs[i];
        var rowMask = new BitVec(STRIDE_MOV);
        for (var j = 0; j < cellRow.length; j++) {
            if (cellRow[j] === ellipsisPattern)
                continue;
            rowMask.ior(cellRow[j].movementsPresent);
        }
        ruleMasks_mov.push(rowMask);
    }
    return ruleMasks_mov;
}

function collapseRules(groups) {
    for (var gn = 0; gn < groups.length; gn++) {
        var rules = groups[gn];
        for (var i = 0; i < rules.length; i++) {
            var oldrule = rules[i];
            var newrule = [0, [], oldrule.rhs.length > 0, oldrule.lineNumber /*ellipses,group number,rigid,commands,randomrule,[cellrowmasks]*/ ];
            var ellipses = [];
            for (var j = 0; j < oldrule.lhs.length; j++) {
                ellipses.push(0);
            }

            newrule[0] = dirMasks[oldrule.direction];
            for (var j = 0; j < oldrule.lhs.length; j++) {
                var cellrow_l = oldrule.lhs[j];
                for (var k = 0; k < cellrow_l.length; k++) {
                    if (cellrow_l[k] === ellipsisPattern) {
                        ellipses[j] ++;
                        if (ellipses[j]>2) {
                            logError("You can't use more than two ellipses in a single cell match pattern.", oldrule.lineNumber);
                        } else {
                            if (k>0 && cellrow_l[k-1]===ellipsisPattern){
                                logWarning("Why would you go and have two ellipses in a row like that? It's exactly the same as just having a single ellipsis, right?", oldrule.lineNumber);
                            }
                        }
                    }
                }
                newrule[1][j] = cellrow_l;
            }
            newrule.push(ellipses);
            newrule.push(oldrule.groupNumber);
            newrule.push(oldrule.rigid);
            newrule.push(oldrule.commands);
            newrule.push(oldrule.randomRule);
            newrule.push(cellRowMasks(newrule));
            newrule.push(cellRowMasks_Movements(newrule));
            rules[i] = new Rule(newrule);
        }
    }
    matchCache = {}; // clear match cache so we don't slowly leak memory
}



function ruleGroupDiscardOverlappingTest(ruleGroup) {
    if (ruleGroup.length === 0)
        return;
    
    var discards=[];

    for (var i = 0; i < ruleGroup.length; i++) {
        var rule = ruleGroup[i];
        if (rule.hasOwnProperty('discard')) {
            
            var beforesame = i===0 ? false : ruleGroup[i-1].lineNumber === rule.lineNumber;
            var aftersame = i===(ruleGroup.length-1) ? false : ruleGroup[i+1].lineNumber === rule.lineNumber;

            ruleGroup.splice(i, 1);
            
            var found=false;
            for(var j=0;j<discards.length;j++){
                var discard=discards[j];
                if (discard[0]===rule.discard[0] && discard[1]===rule.discard[1]){
                    found=true;
                    break;
                }
            }
            if(!found){
                discards.push(rule.discard)
            }

            //if rule before isn't of same linenumber, and rule after isn't of same linenumber, 
            //then a rule has been totally erased and you should throw an error!
            if ( !(beforesame||aftersame) || ruleGroup.length===0) {
                
                const example = discards[0];
                
                var parenthetical = "";
                if (discards.length>1){
                    parenthetical = " (ditto for ";
                    for (var j=1;j<discards.length;j++){
                        if (j>1){
                            parenthetical+=", "
                            
                            if (j===discards.length-1){
                                parenthetical += "and ";
                            }
                        }

                        const thisdiscard = discards[j];
                        const p1 = thisdiscard[0];
                        const p2 = thisdiscard[1];
                        parenthetical += `${p1}/${p2}`;

                        if (j===3 && discards.length>4){
                            parenthetical+=" etc.";
                            break;
                        }
                    }
                    parenthetical += ")";
                }

                logError(`${example[0]} and ${example[1]} can never overlap${parenthetical}, but this rule requires that to happen, so it's being culled.`, rule.lineNumber);
            }
            i--;
        }
    }
}

function arrangeRulesByGroupNumber(state) {
    var aggregates = {};
    var aggregates_late = {};
    for (var i = 0; i < state.rules.length; i++) {
        var rule = state.rules[i];
        var targetArray = aggregates;
        if (rule.late) {
            targetArray = aggregates_late;
        }

        if (targetArray[rule.groupNumber] == undefined) {
            targetArray[rule.groupNumber] = [];
        }
        targetArray[rule.groupNumber].push(rule);
    }

    var result = [];
    for (var groupNumber in aggregates) {
        if (aggregates.hasOwnProperty(groupNumber)) {
            var ruleGroup = aggregates[groupNumber];
            ruleGroupDiscardOverlappingTest(ruleGroup);
            if (ruleGroup.length > 0) {
                result.push(ruleGroup);
            }
        }
    }
    var result_late = [];
    for (var groupNumber in aggregates_late) {
        if (aggregates_late.hasOwnProperty(groupNumber)) {
            var ruleGroup = aggregates_late[groupNumber];
            ruleGroupDiscardOverlappingTest(ruleGroup);
            if (ruleGroup.length > 0) {
                result_late.push(ruleGroup);
            }
        }
    }
    state.rules = result;

    //check that there're no late movements with direction requirements on the lhs
    state.lateRules = result_late;
}

function generateRigidGroupList(state) {
    var rigidGroupIndex_to_GroupIndex = [];
    var groupIndex_to_RigidGroupIndex = [];
    var groupNumber_to_GroupIndex = [];
    var groupNumber_to_RigidGroupIndex = [];
    var rigidGroups = [];
    for (var i = 0; i < state.rules.length; i++) {
        var ruleset = state.rules[i];
        var rigidFound = false;
        for (var j = 0; j < ruleset.length; j++) {
            var rule = ruleset[j];
            if (rule.isRigid) {
                rigidFound = true;
            }
        }
        rigidGroups[i] = rigidFound;
        if (rigidFound) {
            var groupNumber = ruleset[0].groupNumber;
            groupNumber_to_GroupIndex[groupNumber] = i;
            var rigid_group_index = rigidGroupIndex_to_GroupIndex.length;
            groupIndex_to_RigidGroupIndex[i] = rigid_group_index;
            groupNumber_to_RigidGroupIndex[groupNumber] = rigid_group_index;
            rigidGroupIndex_to_GroupIndex.push(i);
        }
    }
    if (rigidGroupIndex_to_GroupIndex.length > 30) {
        var group_index = rigidGroupIndex_to_GroupIndex[30];
        logError("There can't be more than 30 rigid groups (rule groups containing rigid members).", state.rules[group_index][0].lineNumber);
    }

    state.rigidGroups = rigidGroups;
    state.rigidGroupIndex_to_GroupIndex = rigidGroupIndex_to_GroupIndex;
    state.groupNumber_to_RigidGroupIndex = groupNumber_to_RigidGroupIndex;
    state.groupIndex_to_RigidGroupIndex = groupIndex_to_RigidGroupIndex;
}

function getMaskFromName(state, name) {
    var objectMask = new BitVec(STRIDE_OBJ);
    if (name in state.objects) {
        var o = state.objects[name];
        objectMask.ibitset(o.id);
    }

    if (name in state.aggregatesDict) {
        var objectnames = state.aggregatesDict[name];
        for (var i = 0; i < objectnames.length; i++) {
            var n = objectnames[i];
            var o = state.objects[n];
            objectMask.ibitset(o.id);
        }
    }

    if (name in state.propertiesDict) {
        var objectnames = state.propertiesDict[name];
        for (var i = 0; i < objectnames.length; i++) {
            var n = objectnames[i];
            var o = state.objects[n];
            objectMask.ibitset(o.id);
        }
    }

    if (name in state.synonymsDict) {
        var n = state.synonymsDict[name];
        var o = state.objects[n];
        objectMask.ibitset(o.id);
    }

    if (objectMask.iszero()) {
        logErrorNoLine("error, didn't find any object called player, either in the objects section, or the legends section. there must be a player!");
    }
    return objectMask;
}

function generateMasks(state) {
    state.playerMask = getMaskFromName(state, 'player');

    var layerMasks = [];
    var layerCount = state.collisionLayers.length;
    for (var layer = 0; layer < layerCount; layer++) {
        var layerMask = new BitVec(STRIDE_OBJ);
        for (var j = 0; j < state.objectCount; j++) {
            var n = state.idDict[j];
            var o = state.objects[n];
            if (o.layer == layer) {
                layerMask.ibitset(o.id);
            }
        }
        layerMasks.push(layerMask);
    }
    state.layerMasks = layerMasks;

    var objectMask = {};
    for (var n in state.objects) {
        if (state.objects.hasOwnProperty(n)) {
            var o = state.objects[n];
            objectMask[n] = new BitVec(STRIDE_OBJ);
            objectMask[n].ibitset(o.id);
        }
    }

    // Synonyms can depend on properties, and properties can depend on synonyms.
    // Process them in order by combining & sorting by linenumber.

    var synonyms_and_properties = state.legend_synonyms.concat(state.legend_properties);
    synonyms_and_properties.sort(function(a, b) {
        return a.lineNumber - b.lineNumber;
    });

    for (var i = 0; i < synonyms_and_properties.length; i++) {
        var synprop = synonyms_and_properties[i];
        if (synprop.length == 2) {
            // synonym (a = b)
            objectMask[synprop[0]] = objectMask[synprop[1]];
        } else {
            // property (a = b or c)
            var val = new BitVec(STRIDE_OBJ);
            for (var j = 1; j < synprop.length; j++) {
                var n = synprop[j];
                val.ior(objectMask[n]);
            }
            objectMask[synprop[0]] = val;
        }
    }

    //use \n as a delimeter for internal-only objects
    var all_obj = new BitVec(STRIDE_OBJ);
    all_obj.inot();
    objectMask["\nall\n"] = all_obj;

    state.objectMasks = objectMask;

    
    state.aggregateMasks = {};

    //set aggregate masks similarly
    for (var aggregateName of Object.keys(state.aggregatesDict)) {
        var objectnames = state.aggregatesDict[aggregateName];
        
        var aggregateMask = new BitVec(STRIDE_OBJ);
        for (var i = 0; i < objectnames.length; i++) {
            var n = objectnames[i];
            var o = state.objects[n];
            aggregateMask.ior(objectMask[n]);
        }
        state.aggregateMasks[aggregateName] = aggregateMask;
    }
}

function checkObjectsAreLayered(state) {
    for (var n in state.objects) {
        if (state.objects.hasOwnProperty(n)) {
            var found = false;
            for (var i = 0; i < state.collisionLayers.length; i++) {
                var layer = state.collisionLayers[i];
                for (var j = 0; j < layer.length; j++) {
                    if (layer[j] === n) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
            if (found === false) {
                var o = state.objects[n];
                logError('Object "' + n.toUpperCase() + '" has been defined, but not assigned to a layer.', o.lineNumber);
            }
        }
    }
}

function isInt(value) {
return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}

function twiddleMetaData(state) {
    var newmetadata = {};
    for (var i = 0; i < state.metadata.length; i += 2) {
        var key = state.metadata[i];
        var val = state.metadata[i + 1];
        newmetadata[key] = val;
    }


    const getIntCheckedPositive = function(s,lineNumber){
        if (!isFinite(s) || !isInt(s)){
            logWarning(`Wasn't able to make sense of "${s}" as a (whole number) dimension.`,lineNumber);
            return NaN;
        }
        var result = parseInt(s);
        if (isNaN(result)){
            logWarning(`Wasn't able to make sense of "${s}" as an dimension.`,lineNumber);
        }
        if (result<=0){
            logWarning(`The dimension given to me (you gave "${s}") is baad - it should be greater than 0.`,lineNumber);
        }
        return result;
    }
    const getCoords = function(str,lineNumber){
        var coords = val.split('x');
        if (coords.length!==2){
            logWarning("Dimensions must be of the form AxB.",lineNumber);
            return null;
        } else {
            var intcoords = [getIntCheckedPositive(coords[0],lineNumber), getIntCheckedPositive(coords[1],lineNumber)];
            if (!isFinite(coords[0]) || !isFinite(coords[1]) || isNaN(intcoords[0]) || isNaN(intcoords[1])) {
                logWarning(`Couldn't understand the dimensions given to me (you gave "${val}") - should be of the form AxB.`,lineNumber);
                return null
            } else {
                if (intcoords[0]<=0 || intcoords[1]<=0){
                    logWarning(`The dimensions given to me (you gave "${val}") are baad - they should be > 0.`,lineNumber);
                }
                return intcoords;
            }
        }
    }
    if (newmetadata.flickscreen !== undefined) {
        var val = newmetadata.flickscreen;
        newmetadata.flickscreen = getCoords(val,state.metadata_lines.flickscreen);
        if (newmetadata.flickscreen===null){
            delete newmetadata.flickscreen;
        }
    }
    if (newmetadata.zoomscreen !== undefined) {
        var val = newmetadata.zoomscreen;
        newmetadata.zoomscreen = getCoords(val,state.metadata_lines.zoomscreen);
        if (newmetadata.zoomscreen===null){
            delete newmetadata.zoomscreen;
        }
    }

    state.metadata = newmetadata;
}

function processWinConditions(state) {
    //	[-1/0/1 (no,some,all),ob1,ob2] (ob2 is background by default)
    var newconditions = [];
    for (var i = 0; i < state.winconditions.length; i++) {
        var wincondition = state.winconditions[i];
        if (wincondition.length == 0) {
            return;
        }
        var num = 0;
        switch (wincondition[0]) {
            case 'no':
                { num = -1; break; }
            case 'all':
                { num = 1; break; }
        }

        var lineNumber = wincondition[wincondition.length - 1];

        var n1 = wincondition[1];
        var n2;
        if (wincondition.length == 5) {
            n2 = wincondition[3];
        } else {
            n2 = '\nall\n';
        }

        var mask1 = 0;
        var mask2 = 0;
        var aggr1 = false;
        var aggr2 = false;

        if (n1 in state.objectMasks) {
            aggr1 = false;
            mask1 = state.objectMasks[n1];
        } else if (n1 in state.aggregateMasks){
            aggr1 = true;
            mask1 = state.aggregateMasks[n1];
        } else {
            logError('Unwelcome term "' + n1 + '" found in win condition. I don\'t know what I\'m supposed to do with this. ', lineNumber);
        }
        if (n2 in state.objectMasks) {
            aggr2=false;
            mask2 = state.objectMasks[n2];
        } else if (n2 in state.aggregateMasks){
            aggr2 = true;
            mask2 = state.aggregateMasks[n2];
        } else  {
            logError('Unwelcome term "' + n1 + '" found in win condition. I don\'t know what I\'m supposed to do with this. ', lineNumber);
        }
        var newcondition = [num, mask1, mask2, lineNumber, aggr1, aggr2];
        newconditions.push(newcondition);
    }
    state.winconditions = newconditions;
}

function printCellRow(cellRow) {
    var result = "[ ";
    for (var i = 0; i < cellRow.length; i++) {
        if (i > 0) {
            result += "| ";
        }
        var cell = cellRow[i];
        for (var j = 0; j < cell.length; j += 2) {
            var direction = cell[j];
            var object = cell[j + 1]
            if (direction === "...") {
                result += direction + " ";
            } else {
                result += direction + " " + object + " ";
            }
        }
    }
    result += "] ";
    return result;
}

function cacheRuleStringRep(rule) {
    var result = "(<a onclick=\"jumpToLine('" + rule.lineNumber.toString() + "');\"  href=\"javascript:void(0);\">" + rule.lineNumber + "</a>) " + rule.direction.toString().toUpperCase() + " ";
    if (rule.rigid) {
        result = "RIGID " + result + " ";
    }
    if (rule.randomRule) {
        result = "RANDOM " + result + " ";
    }
    if (rule.late) {
        result = "LATE " + result + " ";
    }
    for (var i = 0; i < rule.lhs.length; i++) {
        var cellRow = rule.lhs[i];
        result = result + printCellRow(cellRow);
    }
    result = result + "-> ";
    for (var i = 0; i < rule.rhs.length; i++) {
        var cellRow = rule.rhs[i];
        result = result + printCellRow(cellRow);
    }
    for (var i = 0; i < rule.commands.length; i++) {
        var command = rule.commands[i];
        if (command.length === 1) {
            result = result + command[0].toString();
        } else {
            result = result + '(' + command[0].toString() + ", " + command[1].toString() + ') ';
        }
    }
    //print commands next
    rule.stringRep = result;
}

function cacheAllRuleNames(state) {

    for (var i = 0; i < state.rules.length; i++) {
        var rule = state.rules[i];
        cacheRuleStringRep(rule);
    }
}

function printRules(state) {
    var output = "";
    var loopIndex = 0;
    var loopEnd = -1;
    var discardcount = 0;
    for (var i = 0; i < state.rules.length; i++) {
        var rule = state.rules[i];
        if (loopIndex < state.loops.length) {
            if (state.loops[loopIndex][0] < rule.lineNumber) {
                output += "STARTLOOP<br>";
                loopIndex++;
                if (loopIndex < state.loops.length) { // don't die with mismatched loops
                    loopEnd = state.loops[loopIndex][0];
                    loopIndex++;
                }
            }
        }
        if (loopEnd !== -1 && loopEnd < rule.lineNumber) {
            output += "ENDLOOP<br>";
            loopEnd = -1;
        }
        if (rule.hasOwnProperty('discard')) {
            discardcount++;
        } else {
            var sameGroupAsPrevious = i>0 && state.rules[i-1].groupNumber === rule.groupNumber;
            if (sameGroupAsPrevious){
                output += '+ ';
            } else {
                output += '&nbsp;&nbsp;';
            }
            output += rule.stringRep + "<br>";
        }
    }
    if (loopEnd !== -1) { // no more rules after loop end
        output += "ENDLOOP<br>";
    }
    output += "===========<br>";
    output = "<br>Rule Assembly : (" + (state.rules.length - discardcount) + " rules)<br>===========<br>" + output;
    consolePrint(output);
}

function removeDuplicateRules(state) {
    var record = {};
    var newrules = [];
    var lastgroupnumber = -1;
    for (var i = state.rules.length - 1; i >= 0; i--) {
        var r = state.rules[i];
        var groupnumber = r.groupNumber;
        if (groupnumber !== lastgroupnumber) {
            record = {};
        }
        var r_string = r.stringRep;
        if (record.hasOwnProperty(r_string)) {
            state.rules.splice(i, 1);
        } else {
            record[r_string] = true;
        }
        lastgroupnumber = groupnumber;
    }
}

function generateLoopPoints(state) {
    var loopPoint = {};
    var loopPointIndex = 0;
    var outside = true;
    var source = 0;
    var target = 0;
    if (state.loops.length > 0) {
        for (var i=0;i<state.loops.length;i++){
            var loop = state.loops[i];
            if (i%2===0){
                if (loop[1]===-1){         
                    logError("Found an ENDLOOP, but I'm not in a loop?",loop[0]);
                }
            } else {
                if (loop[1]===1){         
                    logError("Found a STARTLOOP, but I'm already inside a loop? (Puzzlescript can't nest loops, FWIW).",loop[0]);
                }
            }
        }
        var lastloop=state.loops[state.loops.length-1];
        if (lastloop[1]!==-1){
            logError("Yo I found a STARTLOOP without a corresponding ENDLOOP.",lastloop[0]);

        }
        // logError("Have to have matching number of  'startLoop' and 'endLoop' loop points.",state.loops[state.loops.length-1][0]);
    }

    for (var j = 0; j < state.loops.length; j++) {
        var loop = state.loops[j];
        for (var i = 0; i < state.rules.length; i++) {
            var ruleGroup = state.rules[i];

            var firstRule = ruleGroup[0];
            var lastRule = ruleGroup[ruleGroup.length - 1];

            var firstRuleLine = firstRule.lineNumber;
            var lastRuleLine = lastRule.lineNumber;

            if (loop[0] >= firstRuleLine && loop[0] <= lastRuleLine) {
                logWarning("Found a loop point in the middle of a rule. You probably don't want to do this, right?", loop[0]);
            }
            if (outside) {
                if (firstRuleLine >= loop[0]) {
                    target = i;
                    outside = false;
                    break;
                }
            } else {
                if (firstRuleLine >= loop[0]) {
                    source = i - 1;
                    loopPoint[source] = target;
                    outside = true;
                    break;
                }
            }
        }
    }
    if (outside === false) {
        var source = state.rules.length;
        loopPoint[source] = target;
    } else {}
    state.loopPoint = loopPoint;

    loopPoint = {};
    outside = true;
    for (var j = 0; j < state.loops.length; j++) {
        var loop = state.loops[j];
        for (var i = 0; i < state.lateRules.length; i++) {
            var ruleGroup = state.lateRules[i];

            var firstRule = ruleGroup[0];
            var lastRule = ruleGroup[ruleGroup.length - 1];

            var firstRuleLine = firstRule.lineNumber;
            var lastRuleLine = lastRule.lineNumber;

            if (outside) {
                if (firstRuleLine >= loop[0]) {
                    target = i;
                    outside = false;
                    break;
                }
            } else {
                if (firstRuleLine >= loop[0]) {
                    source = i - 1;
                    loopPoint[source] = target;
                    outside = true;
                    break;
                }
            }
        }
    }
    if (outside === false) {
        var source = state.lateRules.length;
        loopPoint[source] = target;
    } else {}
    state.lateLoopPoint = loopPoint;
}

function validSeed(seed) {
    return /^\s*\d+\s*$/.exec(seed) !== null;
}

var soundDirectionIndicatorMasks = {
    'up': parseInt('00001', 2),
    'down': parseInt('00010', 2),
    'left': parseInt('00100', 2),
    'right': parseInt('01000', 2),
    'horizontal': parseInt('01100', 2),
    'vertical': parseInt('00011', 2),
    'orthogonal': parseInt('01111', 2),
    '___action____': parseInt('10000', 2)
};

var soundDirectionIndicators = ["up", "down", "left", "right", "horizontal", "vertical", "orthogonal", "___action____"];


function generateSoundData(state) {
    var sfx_Events = {};
    var sfx_CreationMasks = [];
    var sfx_DestructionMasks = [];
    var sfx_MovementMasks = state.collisionLayers.map(x => []);
    var sfx_MovementFailureMasks = [];

    for (var i = 0; i < state.sounds.length; i++) {
        var sound = state.sounds[i];
        if (sound.length <= 1) {
            continue;
        }
        var lineNumber = sound[sound.length - 1];

        if (sound.length === 2) {
            logError('incorrect sound declaration.', lineNumber);
            continue;
        }

        const v0=sound[0][0].trim();
        const t0=sound[0][1].trim();
        const v1=sound[1][0].trim();
        const t1=sound[1][1].trim();
        
        var seed = sound[sound.length - 2][0];
        var seed_t = sound[sound.length - 2][1];
        if (seed_t !== 'SOUND') {
            logError("Expecting sfx data, instead found \"" + seed + "\".", lineNumber);
        }

        if (t0 === "SOUNDEVENT") {

            if (sound.length > 4) {
                logError("too much stuff to define a sound event.", lineNumber);
            } else {
                //out of an abundance of caution, doing a fallback warning rather than expanding the scope of the error #779
                if (sound.length > 3) {
                    logWarning("too much stuff to define a sound event.", lineNumber);
                }
            }

            if (sfx_Events[v0] !== undefined) {
                logWarning(v0.toUpperCase() + " already declared.", lineNumber);
            }
            sfx_Events[v0] = seed;

        } else {
            var target = v0;
            var verb = v1;
            var directions = [];
            for (var j=2;j<sound.length-2;j++){//avoid last sound declaration as well as the linenumber element at the end
                if (sound[j][1] === 'DIRECTION') {
                    directions.push(sound[j][0]);      
                } else {
                    //Don't know how if I can get here, but just in case
                    logError(`Expected a direction here, but found instead "$(sound[j][0])".`, lineNumber);
                }
            }
            if (directions.length > 0 && (verb !== 'move' && verb !== 'cantmove')) {
                logError('Incorrect sound declaration - cannot have directions (UP/DOWN/etc.) attached to non-directional sound verbs (CREATE is not directional, but MOVE is directional).', lineNumber);
            }

            if (verb === 'action') {
                verb = 'move';
                directions = ['___action____'];
            }

            if (directions.length == 0) {
                directions = ["orthogonal"];
            }
            

            if (target in state.aggregatesDict) {
                logError('cannot assign sound events to aggregate objects (declared with "and"), only to regular objects, or properties, things defined in terms of "or" ("' + target + '").', lineNumber);
            } else if (target in state.objectMasks) {

            } else {
                logError('Object "' + target + '" not found.', lineNumber);
            }

            var objectMask = state.objectMasks[target];

            var directionMask = 0;
            for (var j = 0; j < directions.length; j++) {
                directions[j] = directions[j].trim();
                var direction = directions[j];
                if (soundDirectionIndicators.indexOf(direction) === -1) {
                    logError('Was expecting a direction, instead found "' + direction + '".', lineNumber);
                } else {
                    var soundDirectionMask = soundDirectionIndicatorMasks[direction];
                    directionMask |= soundDirectionMask;
                }
            }


            var targets = [target];
            var modified = true;
            while (modified) {
                modified = false;
                for (var k = 0; k < targets.length; k++) {
                    var t = targets[k];
                    if (t in state.synonymsDict) {
                        targets[k] = state.synonymsDict[t];
                        modified = true;
                    } else if (t in state.propertiesDict) {
                        modified = true;
                        var props = state.propertiesDict[t];
                        targets.splice(k, 1);
                        k--;
                        for (var l = 0; l < props.length; l++) {
                            targets.push(props[l]);
                        }
                    }
                }
            }
            
            //if verb in soundverbs_directional
            if (verb === 'move' || verb === 'cantmove') {
                for (var j = 0; j < targets.length; j++) {
                    var targetName = targets[j];
                    var targetDat = state.objects[targetName];
                    var targetLayer = targetDat.layer;
                    var shiftedDirectionMask = new BitVec(STRIDE_MOV);
                    shiftedDirectionMask.ishiftor(directionMask, 5 * targetLayer);

                    var o = {
                        objectMask: objectMask,
                        directionMask: shiftedDirectionMask,
                        layer:targetLayer,
                        seed: seed
                    };

                    if (verb === 'move') {
                        sfx_MovementMasks[targetLayer].push(o);
                    } else {
                        sfx_MovementFailureMasks.push(o);
                    }
                }
            }



            var targetArray;
            switch (verb) {
                case "create":
                    {
                        var o = {
                            objectMask: objectMask,
                            seed: seed
                        }
                        sfx_CreationMasks.push(o);
                        break;
                    }
                case "destroy":
                    {
                        var o = {
                            objectMask: objectMask,
                            seed: seed
                        }
                        sfx_DestructionMasks.push(o);
                        break;
                    }
            }
        }
    }

    state.sfx_Events = sfx_Events;
    state.sfx_CreationMasks = sfx_CreationMasks;
    state.sfx_DestructionMasks = sfx_DestructionMasks;
    state.sfx_MovementMasks = sfx_MovementMasks;
    state.sfx_MovementFailureMasks = sfx_MovementFailureMasks;
}
var musicDirectionIndicatorMasks = {
    'up': parseInt('00001', 2),
    'down': parseInt('00010', 2),
    'left': parseInt('00100', 2),
    'right': parseInt('01000', 2),
    'horizontal': parseInt('01100', 2),
    'vertical': parseInt('00011', 2),
    'orthogonal': parseInt('01111', 2),
    '___action____': parseInt('10000', 2)
};

var musicDirectionIndicators = ["up", "down", "left", "right", "horizontal", "vertical", "orthogonal", "___action____"];

function generateMusicData(state){ 
    var bgm_Events = {};
    var bgm_CreationMasks = [];
    var bgm_DestructionMasks = [];
    var bgm_MovementMasks = state.collisionLayers.map(x => []);
    var bgm_MovementFailureMasks = [];

    for (var i = 0; i < state.music.length; i++) {
        var music = state.music[i];
        if (music.length <= 1) {
            continue;
        }
        var lineNumber = music[music.length - 1];

        if (music.length === 2) {
            logError('incorrect music declaration.', lineNumber);
            continue;
        }

        const v0=music[0][0].trim();
        const t0=music[0][1].trim();
        const v1=music[1][0].trim();
        const t1=music[1][1].trim();
        
        var seed = music[music.length - 2][0];
        var seed_t = music[music.length - 2][1];
        if (seed_t !== 'MUSIC') {
            logError("Expecting bgm data, instead found \"" + seed + "\".", lineNumber);
        }

        if (t0 === "MUSICEVENT") {

            if (music.length > 4) {
                logError("too much stuff to define a music event.", lineNumber);
            } else {
                //out of an abundance of caution, doing a fallback warning rather than expanding the scope of the error #779
                if (music.length > 3) {
                    logWarning("too much stuff to define a music event.", lineNumber);
                }
            }

            if (bgm_Events[v0] !== undefined) {
                logWarning(v0.toUpperCase() + " already declared.", lineNumber);
            }
            bgm_Events[v0] = seed;

        } else {
            var target = v0;
            var verb = v1;
            var directions = [];
            for (var j=2;j<music.length-2;j++){//avoid last music declaration as well as the linenumber element at the end
                if (music[j][1] === 'DIRECTION') {
                    directions.push(music[j][0]);      
                } else {
                    //Don't know how if I can get here, but just in case
                    logError(`Expected a direction here, but found instead "$(music[j][0])".`, lineNumber);
                }
            }
            if (directions.length > 0 && (verb !== 'move' && verb !== 'cantmove')) {
                logError('Incorrect music declaration - cannot have directions (UP/DOWN/etc.) attached to non-directional music verbs (CREATE is not directional, but MOVE is directional).', lineNumber);
            }

            if (verb === 'action') {
                verb = 'move';
                directions = ['___action____'];
            }

            if (directions.length == 0) {
                directions = ["orthogonal"];
            }
            

            if (target in state.aggregatesDict) {
                logError('cannot assign music events to aggregate objects (declared with "and"), only to regular objects, or properties, things defined in terms of "or" ("' + target + '").', lineNumber);
            } else if (target in state.objectMasks) {

            } else {
                logError('Object "' + target + '" not found.', lineNumber);
            }

            var objectMask = state.objectMasks[target];

            var directionMask = 0;
            for (var j = 0; j < directions.length; j++) {
                directions[j] = directions[j].trim();
                var direction = directions[j];
                if (musicDirectionIndicators.indexOf(direction) === -1) {
                    logError('Was expecting a direction, instead found "' + direction + '".', lineNumber);
                } else {
                    var musicDirectionMask = musicDirectionIndicatorMasks[direction];
                    directionMask |= musicDirectionMask;
                }
            }


            var targets = [target];
            var modified = true;
            while (modified) {
                modified = false;
                for (var k = 0; k < targets.length; k++) {
                    var t = targets[k];
                    if (t in state.synonymsDict) {
                        targets[k] = state.synonymsDict[t];
                        modified = true;
                    } else if (t in state.propertiesDict) {
                        modified = true;
                        var props = state.propertiesDict[t];
                        targets.splice(k, 1);
                        k--;
                        for (var l = 0; l < props.length; l++) {
                            targets.push(props[l]);
                        }
                    }
                }
            }
            
            //if verb in musicverbs_directional
            if (verb === 'move' || verb === 'cantmove') {
                for (var j = 0; j < targets.length; j++) {
                    var targetName = targets[j];
                    var targetDat = state.objects[targetName];
                    var targetLayer = targetDat.layer;
                    var shiftedDirectionMask = new BitVec(STRIDE_MOV);
                    shiftedDirectionMask.ishiftor(directionMask, 5 * targetLayer);

                    var o = {
                        objectMask: objectMask,
                        directionMask: shiftedDirectionMask,
                        layer:targetLayer,
                        seed: seed
                    };

                    if (verb === 'move') {
                        bgm_MovementMasks[targetLayer].push(o);
                    } else {
                        bgm_MovementFailureMasks.push(o);
                    }
                }
            }



            var targetArray;
            switch (verb) {
                case "create":
                    {
                        var o = {
                            objectMask: objectMask,
                            seed: seed
                        }
                        bgm_CreationMasks.push(o);
                        break;
                    }
                case "destroy":
                    {
                        var o = {
                            objectMask: objectMask,
                            seed: seed
                        }
                        bgm_DestructionMasks.push(o);
                        break;
                    }
            }
        }
    }

    state.bgm_Events = bgm_Events;
    state.bgm_CreationMasks = bgm_CreationMasks;
    state.bgm_DestructionMasks = bgm_DestructionMasks;
    state.bgm_MovementMasks = bgm_MovementMasks;
    state.bgm_MovementFailureMasks = bgm_MovementFailureMasks;
}

function formatHomePage(state) {
    if ('background_color' in state.metadata) {
        state.bgcolor = colorToHex(colorPalette, state.metadata.background_color);
    } else {
        state.bgcolor = "#000000";
    }
    if ('text_color' in state.metadata) {
        state.fgcolor = colorToHex(colorPalette, state.metadata.text_color);
    } else {
        state.fgcolor = "#FFFFFF";
    }

    if (isColor(state.fgcolor) === false) {
        logError("text_color in incorrect format - found " + state.fgcolor + ", but I expect a color name (like 'pink') or hex-formatted color (like '#1412FA').  Defaulting to white.",state.metadata_lines.text_color)
        state.fgcolor = "#FFFFFF";
    }
    if (isColor(state.bgcolor) === false) {
        logError("background_color in incorrect format - found " + state.bgcolor + ", but I expect a color name (like 'pink') or hex-formatted color (like '#1412FA').  Defaulting to black.",state.metadata_lines.background_color)
        state.bgcolor = "#000000";
    }

    if (canSetHTMLColors) {

        if ('background_color' in state.metadata) {
            document.body.style.backgroundColor = state.bgcolor;
        }

        if ('text_color' in state.metadata) {
            var separator = document.getElementById("separator");
            if (separator != null) {
                separator.style.color = state.fgcolor;
            }

            var h1Elements = document.getElementsByTagName("a");
            for (var i = 0; i < h1Elements.length; i++) {
                h1Elements[i].style.color = state.fgcolor;
            }

            var h1Elements = document.getElementsByTagName("h1");
            for (var i = 0; i < h1Elements.length; i++) {
                h1Elements[i].style.color = state.fgcolor;
            }
        }
    }

    if ('homepage' in state.metadata) {
        var url = state.metadata['homepage'];
        url = url.replace("http://", "");
        url = url.replace("https://", "");
        state.metadata['homepage'] = url;
    }
}

var MAX_ERRORS = 5;

function loadFile(str) {
    var processor = new codeMirrorFn();
    var state = processor.startState();

    var lines = str.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        state.lineNumber = i + 1;
        var ss = new CodeMirror.StringStream(line, 4);
        do {
            processor.token(ss, state);

            if (errorCount > MAX_ERRORS) {
                consolePrint("too many errors, aborting compilation");
                return;
            }
        }
        while (ss.eol() === false);
    }

    // delete state.lineNumber;

    generateExtraMembers(state);
    generateMasks(state);
    levelsToArray(state);
    rulesToArray(state);
    if (state.invalid>0){
        return null;
    }

    cacheAllRuleNames(state);

    removeDuplicateRules(state);

    if (state.invalid>0){
        return null;
    }

    rulesToMask(state);


    if (debugMode) {
        printRules(state);
    }

    arrangeRulesByGroupNumber(state);
    collapseRules(state.rules);
    collapseRules(state.lateRules);

    generateRigidGroupList(state);

    processWinConditions(state);
    checkObjectsAreLayered(state);

    twiddleMetaData(state);

    generateLoopPoints(state);

    generateSoundData(state);

    generateMusicData(state);

    formatHomePage(state);

    //delete intermediate representations
    delete state.commentLevel;
    delete state.line_should_end;
    delete state.line_should_end_because;
    delete state.sol_after_comment;
    delete state.names;
    delete state.abbrevNames;
    delete state.objects_candname;
    delete state.objects_section;
    delete state.objects_spritematrix;
    delete state.section;
    delete state.subsection;
    delete state.tokenIndex;
    delete state.current_line_wip_array;
    delete state.visitedSections;
    delete state.loops;
    /*
    var lines = stripComments(str);
    window.console.log(lines);
    var sections = generateSections(lines);
    window.console.log(sections);
    var sss = generateSemiStructuredSections(sections);*/
    return state;
}

var ifrm;

function compile(command, text, randomseed) {
    matchCache = {};
    forceRegenImages = true;
    if (command === undefined) {
        command = ["restart"];
    }
    if (randomseed === undefined) {
        randomseed = null;
    }
    lastDownTarget = canvas;

    if (text === undefined) {
        var code = window.form1.code;

        var editor = code.editorreference;

        text = editor.getValue() + "\n";
    }
    if (canDump === true) {
        compiledText = text;
    }

    errorCount = 0;
    compiling = true;
    errorStrings = [];
    consolePrint('=================================');
    try {
        var state = loadFile(text);
    } catch(error){
        consolePrint(error);
        console.log(error);
    } finally {
        compiling = false;
    }

    if (state && state.levels && state.levels.length === 0) {
        logError('No levels found.  Add some levels!', undefined, true);
    }

    if (errorCount > MAX_ERRORS) {
        return;
    }
    

    if (errorCount > 0) {
        if (IDE===false){
            consoleError('<span class="systemMessage">Errors detected during compilation; the game may not work correctly.  If this is an older game, and you think it just broke because of recent changes in the puzzlescript engine, please consider dropping an email to analytic@gmail.com with a link to the game and I\'ll try make sure it\'s back working ASAP.</span>');
        } else{
            consoleError('<span class="systemMessage">Errors detected during compilation; the game may not work correctly.</span>');
        }
    } else {
        var ruleCount = 0;
        for (var i = 0; i < state.rules.length; i++) {
            ruleCount += state.rules[i].length;
        }
        for (var i = 0; i < state.lateRules.length; i++) {
            ruleCount += state.lateRules[i].length;
        }
        if (command[0] == "restart") {
            consolePrint('<span class="systemMessage">Successful Compilation, generated ' + ruleCount + ' instructions.</span>');
        } else {
            consolePrint('<span class="systemMessage">Successful live recompilation, generated ' + ruleCount + ' instructions.</span>');

        }


        
        if (IDE){
            if (state.metadata.title!==undefined) {
                document.title="PuzzleScript - " + state.metadata.title;
            }
        }
    }

    if (state!==null){//otherwise error
        setGameState(state, command, randomseed);
    }

    clearInputHistory();

    consoleCacheDump();

}



function qualifyURL(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.href;
}
