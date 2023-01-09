/*
credits

brunt of the work by increpare (www.increpare.com)

all open source mit license blah blah

testers:
none, yet

code used

colors used
color values for named colours from arne, mostly (and a couple from a 32-colour palette attributed to him)
http://androidarts.com/palette/16pal.htm

the editor is a slight modification of codemirro (codemirror.net), which is crazy awesome.

for post-launch credits, check out activty on github.com/increpare/PuzzleScript

*/


const MAX_ERRORS_FOR_REAL=100;

var compiling = false;
var errorStrings = [];//also stores warning strings
var errorCount=0;//only counts errors

function TooManyErrors(){
    consolePrint("Too many errors/warnings; aborting compilation.",true);
    throw new Error("Too many errors/warnings; aborting compilation.");
}

function logErrorCacheable(str, lineNumber,urgent) {
    if (compiling||urgent) {
        if (lineNumber === undefined) {
            return logErrorNoLine(str,urgent);
        }
        var errorString = '<a onclick="jumpToLine(' + lineNumber.toString() + ');"  href="javascript:void(0);"><span class="errorTextLineNumber"> line ' + lineNumber.toString() + '</span></a> : ' + '<span class="errorText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString);
            errorStrings.push(errorString);
            errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
			}
        }
    }
}

function logError(str, lineNumber,urgent) {
    if (compiling||urgent) {
        if (lineNumber === undefined) {
            return logErrorNoLine(str,urgent);
        }
        var errorString = '<a onclick="jumpToLine(' + lineNumber.toString() + ');"  href="javascript:void(0);"><span class="errorTextLineNumber"> line ' + lineNumber.toString() + '</span></a> : ' + '<span class="errorText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
            errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
			}
        }
    }
}

function logWarning(str, lineNumber,urgent) {
    if (compiling||urgent) {
        if (lineNumber === undefined) {
            return logWarningNoLine(str,urgent);
        }
        var errorString = '<a onclick="jumpToLine(' + lineNumber.toString() + ');"  href="javascript:void(0);"><span class="errorTextLineNumber"> line ' + lineNumber.toString() + '</span></a> : ' + '<span class="warningText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
			}
        }
    }
}

function logWarningNoLine(str,urgent) {
    if (compiling||urgent) {
        var errorString = '<span class="warningText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
            errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
			}
        }
    }
}


function logErrorNoLine(str,urgent) {
    if (compiling||urgent) {
        var errorString = '<span class="errorText">' + str + '</span>';
         if (errorStrings.indexOf(errorString) >= 0 && !urgent) {
            //do nothing, duplicate error
         } else {
            consolePrint(errorString,true);
            errorStrings.push(errorString);
            errorCount++;
			if (errorStrings.length>MAX_ERRORS_FOR_REAL){
                TooManyErrors();
			}
        }
    }
}

function blankLineHandle(state) {
    if (state.section === 'levels') {
            if (state.levels[state.levels.length - 1].length > 0)
            {
                state.levels.push([]);
            }
    } else if (state.section === 'objects') {
        state.objects_section = 0;
    }
}

//returns null if not delcared, otherwise declaration
//note to self: I don't think that aggregates or properties know that they're aggregates or properties in and of themselves.
function wordAlreadyDeclared(state,n) {
    n = n.toLowerCase();
    if (n in state.objects) {
        return state.objects[n];
    } 
    for (var i=0;i<state.legend_aggregates.length;i++) {
        var a = state.legend_aggregates[i];
        if (a[0]===n) {                                			
            return state.legend_aggregates[i];
        }
    }
    for (var i=0;i<state.legend_properties.length;i++) {
        var a = state.legend_properties[i];
        if (a[0]===n) {  
            return state.legend_properties[i];
        }
    }
    for (var i=0;i<state.legend_synonyms.length;i++) {
        var a = state.legend_synonyms[i];
        if (a[0]===n) {  
            return state.legend_synonyms[i];
        }
    }
    return null;
}


//for IE support
if (typeof Object.assign != 'function') {
  (function () {
    Object.assign = function (target) {
      'use strict';
      // We must check against these specific cases.
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
 
      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}


var codeMirrorFn = function() {
    'use strict';

    function checkNameDefined(state,candname) {
        if (state.objects[candname] !== undefined) {
            return;
        }
        for (var i=0;i<state.legend_synonyms.length;i++) {
            var entry = state.legend_synonyms[i];
            if (entry[0]==candname) {
                return;                                       
            }
        }
        for (var i=0;i<state.legend_aggregates.length;i++) {
            var entry = state.legend_aggregates[i];
            if (entry[0]==candname) {
                return;                                                                          
            }
        }
        for (var i=0;i<state.legend_properties.length;i++) {
            var entry = state.legend_properties[i];
            if (entry[0]==candname) {
                return;                                    
            }
        }
        
        logError(`You're talking about ${candname.toUpperCase()} but it's not defined anywhere.`, state.lineNumber);    
    }

    function registerOriginalCaseName(state,candname,mixedCase,lineNumber){

        function escapeRegExp(str) {
          return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }

        var nameFinder =  new RegExp("\\b"+escapeRegExp(candname)+"\\b","i")
        var match = mixedCase.match(nameFinder);
        if (match!=null){
            state.original_case_names[candname] = match[0];
            state.original_line_numbers[candname] = lineNumber;
        }
    }

    const absolutedirs = ['up', 'down', 'right', 'left'];
    const relativedirs = ['^', 'v', '<', '>', 'moving','stationary','parallel','perpendicular', 'no'];
    const logicWords = ['all', 'no', 'on', 'some'];
    const sectionNames = ['objects', 'legend', 'sounds', 'musics', 'collisionlayers', 'rules', 'winconditions', 'levels'];
	const commandwords = ["sfx000", "sfx001", "sfx002", "sfx003", "sfx004", "sfx005", "sfx006", "sfx007", "sfx008", "sfx009", "sfx010", "sfx011", "sfx012", "sfx013", "sfx014", "sfx015", "sfx016", "sfx017", "sfx018", "sfx019", "sfx020", "sfx021", "sfx022", "sfx023", "sfx024", "sfx025", "sfx026", "sfx027", "sfx028", "sfx029", "sfx030", "sfx031", "sfx032", "sfx033", "sfx034", "sfx035", "sfx036", "sfx037", "sfx038", "sfx039", "sfx040", "sfx041", "sfx042", "sfx043", "sfx044", "sfx045", "sfx046", "sfx047", "sfx048", "sfx049", "sfx050", "sfx051", "sfx052", "sfx053", "sfx054", "sfx055", "sfx056", "sfx057", "sfx058", "sfx059", "sfx060", "sfx061", "sfx062", "sfx063", "sfx064", "sfx065", "sfx066", "sfx067", "sfx068", "sfx069", "sfx070", "sfx071", "sfx072", "sfx073", "sfx074", "sfx075", "sfx076", "sfx077", "sfx078", "sfx079", "sfx080", "sfx081", "sfx082", "sfx083", "sfx084", "sfx085", "sfx086", "sfx087", "sfx088", "sfx089", "sfx090", "sfx091", "sfx092", "sfx093", "sfx094", "sfx095", "sfx096", "sfx097", "sfx098", "sfx099", "sfx100", "sfx101", "sfx102", "sfx103", "sfx104", "sfx105", "sfx106", "sfx107", "sfx108", "sfx109", "sfx110", "sfx111", "sfx112", "sfx113", "sfx114", "sfx115", "sfx116", "sfx117", "sfx118", "sfx119", "sfx120", "sfx121", "sfx122", "sfx123", "sfx124", "sfx125", "sfx126", "sfx127", "sfx128", "sfx129", "sfx130", "sfx131", "sfx132", "sfx133", "sfx134", "sfx135", "sfx136", "sfx137", "sfx138", "sfx139", "sfx140", "sfx141", "sfx142", "sfx143", "sfx144", "sfx145", "sfx146", "sfx147", "sfx148", "sfx149", "sfx150", "sfx151", "sfx152", "sfx153", "sfx154", "sfx155", "sfx156", "sfx157", "sfx158", "sfx159", "sfx160", "sfx161", "sfx162", "sfx163", "sfx164", "sfx165", "sfx166", "sfx167", "sfx168", "sfx169", "sfx170", "sfx171", "sfx172", "sfx173", "sfx174", "sfx175", "sfx176", "sfx177", "sfx178", "sfx179", "sfx180", "sfx181", "sfx182", "sfx183", "sfx184", "sfx185", "sfx186", "sfx187", "sfx188", "sfx189", "sfx190", "sfx191", "sfx192", "sfx193", "sfx194", "sfx195", "sfx196", "sfx197", "sfx198", "sfx199", "sfx200", "sfx201", "sfx202", "sfx203", "sfx204", "sfx205", "sfx206", "sfx207", "sfx208", "sfx209", "sfx210", "sfx211", "sfx212", "sfx213", "sfx214", "sfx215", "sfx216", "sfx217", "sfx218", "sfx219", "sfx220", "sfx221", "sfx222", "sfx223", "sfx224", "sfx225", "sfx226", "sfx227", "sfx228", "sfx229", "sfx230", "sfx231", "sfx232", "sfx233", "sfx234", "sfx235", "sfx236", "sfx237", "sfx238", "sfx239", "sfx240", "sfx241", "sfx242", "sfx243", "sfx244", "sfx245", "sfx246", "sfx247", "sfx248", "sfx249", "sfx250", "sfx251", "sfx252", "sfx253", "sfx254", "sfx255", "sfx256", "sfx257", "sfx258", "sfx259", "sfx260", "sfx261", "sfx262", "sfx263", "sfx264", "sfx265", "sfx266", "sfx267", "sfx268", "sfx269", "sfx270", "sfx271", "sfx272", "sfx273", "sfx274", "sfx275", "sfx276", "sfx277", "sfx278", "sfx279", "sfx280", "sfx281", "sfx282", "sfx283", "sfx284", "sfx285", "sfx286", "sfx287", "sfx288", "sfx289", "sfx290", "sfx291", "sfx292", "sfx293", "sfx294", "sfx295", "sfx296", "sfx297", "sfx298", "sfx299", "sfx300", "sfx301", "sfx302", "sfx303", "sfx304", "sfx305", "sfx306", "sfx307", "sfx308", "sfx309", "sfx310", "sfx311", "sfx312", "sfx313", "sfx314", "sfx315", "sfx316", "sfx317", "sfx318", "sfx319", "sfx320", "sfx321", "sfx322", "sfx323", "sfx324", "sfx325", "sfx326", "sfx327", "sfx328", "sfx329", "sfx330", "sfx331", "sfx332", "sfx333", "sfx334", "sfx335", "sfx336", "sfx337", "sfx338", "sfx339", "sfx340", "sfx341", "sfx342", "sfx343", "sfx344", "sfx345", "sfx346", "sfx347", "sfx348", "sfx349", "sfx350", "sfx351", "sfx352", "sfx353", "sfx354", "sfx355", "sfx356", "sfx357", "sfx358", "sfx359", "sfx360", "sfx361", "sfx362", "sfx363", "sfx364", "sfx365", "sfx366", "sfx367", "sfx368", "sfx369", "sfx370", "sfx371", "sfx372", "sfx373", "sfx374", "sfx375", "sfx376", "sfx377", "sfx378", "sfx379", "sfx380", "sfx381", "sfx382", "sfx383", "sfx384", "sfx385", "sfx386", "sfx387", "sfx388", "sfx389", "sfx390", "sfx391", "sfx392", "sfx393", "sfx394", "sfx395", "sfx396", "sfx397", "sfx398", "sfx399", "sfx400", "sfx401", "sfx402", "sfx403", "sfx404", "sfx405", "sfx406", "sfx407", "sfx408", "sfx409", "sfx410", "sfx411", "sfx412", "sfx413", "sfx414", "sfx415", "sfx416", "sfx417", "sfx418", "sfx419", "sfx420", "sfx421", "sfx422", "sfx423", "sfx424", "sfx425", "sfx426", "sfx427", "sfx428", "sfx429", "sfx430", "sfx431", "sfx432", "sfx433", "sfx434", "sfx435", "sfx436", "sfx437", "sfx438", "sfx439", "sfx440", "sfx441", "sfx442", "sfx443", "sfx444", "sfx445", "sfx446", "sfx447", "sfx448", "sfx449", "sfx450", "sfx451", "sfx452", "sfx453", "sfx454", "sfx455", "sfx456", "sfx457", "sfx458", "sfx459", "sfx460", "sfx461", "sfx462", "sfx463", "sfx464", "sfx465", "sfx466", "sfx467", "sfx468", "sfx469", "sfx470", "sfx471", "sfx472", "sfx473", "sfx474", "sfx475", "sfx476", "sfx477", "sfx478", "sfx479", "sfx480", "sfx481", "sfx482", "sfx483", "sfx484", "sfx485", "sfx486", "sfx487", "sfx488", "sfx489", "sfx490", "sfx491", "sfx492", "sfx493", "sfx494", "sfx495", "sfx496", "sfx497", "sfx498", "sfx499", "sfx500", "sfx501", "sfx502", "sfx503", "sfx504", "sfx505", "sfx506", "sfx507", "sfx508", "sfx509", "sfx510", "sfx511", "sfx512", "sfx513", "sfx514", "sfx515", "sfx516", "sfx517", "sfx518", "sfx519", "sfx520", "sfx521", "sfx522", "sfx523", "sfx524", "sfx525", "sfx526", "sfx527", "sfx528", "sfx529", "sfx530", "sfx531", "sfx532", "sfx533", "sfx534", "sfx535", "sfx536", "sfx537", "sfx538", "sfx539", "sfx540", "sfx541", "sfx542", "sfx543", "sfx544", "sfx545", "sfx546", "sfx547", "sfx548", "sfx549", "sfx550", "sfx551", "sfx552", "sfx553", "sfx554", "sfx555", "sfx556", "sfx557", "sfx558", "sfx559", "sfx560", "sfx561", "sfx562", "sfx563", "sfx564", "sfx565", "sfx566", "sfx567", "sfx568", "sfx569", "sfx570", "sfx571", "sfx572", "sfx573", "sfx574", "sfx575", "sfx576", "sfx577", "sfx578", "sfx579", "sfx580", "sfx581", "sfx582", "sfx583", "sfx584", "sfx585", "sfx586", "sfx587", "sfx588", "sfx589", "sfx590", "sfx591", "sfx592", "sfx593", "sfx594", "sfx595", "sfx596", "sfx597", "sfx598", "sfx599", "sfx600", "sfx601", "sfx602", "sfx603", "sfx604", "sfx605", "sfx606", "sfx607", "sfx608", "sfx609", "sfx610", "sfx611", "sfx612", "sfx613", "sfx614", "sfx615", "sfx616", "sfx617", "sfx618", "sfx619", "sfx620", "sfx621", "sfx622", "sfx623", "sfx624", "sfx625", "sfx626", "sfx627", "sfx628", "sfx629", "sfx630", "sfx631", "sfx632", "sfx633", "sfx634", "sfx635", "sfx636", "sfx637", "sfx638", "sfx639", "sfx640", "sfx641", "sfx642", "sfx643", "sfx644", "sfx645", "sfx646", "sfx647", "sfx648", "sfx649", "sfx650", "sfx651", "sfx652", "sfx653", "sfx654", "sfx655", "sfx656", "sfx657", "sfx658", "sfx659", "sfx660", "sfx661", "sfx662", "sfx663", "sfx664", "sfx665", "sfx666", "sfx667", "sfx668", "sfx669", "sfx670", "sfx671", "sfx672", "sfx673", "sfx674", "sfx675", "sfx676", "sfx677", "sfx678", "sfx679", "sfx680", "sfx681", "sfx682", "sfx683", "sfx684", "sfx685", "sfx686", "sfx687", "sfx688", "sfx689", "sfx690", "sfx691", "sfx692", "sfx693", "sfx694", "sfx695", "sfx696", "sfx697", "sfx698", "sfx699", "sfx700", "sfx701", "sfx702", "sfx703", "sfx704", "sfx705", "sfx706", "sfx707", "sfx708", "sfx709", "sfx710", "sfx711", "sfx712", "sfx713", "sfx714", "sfx715", "sfx716", "sfx717", "sfx718", "sfx719", "sfx720", "sfx721", "sfx722", "sfx723", "sfx724", "sfx725", "sfx726", "sfx727", "sfx728", "sfx729", "sfx730", "sfx731", "sfx732", "sfx733", "sfx734", "sfx735", "sfx736", "sfx737", "sfx738", "sfx739", "sfx740", "sfx741", "sfx742", "sfx743", "sfx744", "sfx745", "sfx746", "sfx747", "sfx748", "sfx749", "sfx750", "sfx751", "sfx752", "sfx753", "sfx754", "sfx755", "sfx756", "sfx757", "sfx758", "sfx759", "sfx760", "sfx761", "sfx762", "sfx763", "sfx764", "sfx765", "sfx766", "sfx767", "sfx768", "sfx769", "sfx770", "sfx771", "sfx772", "sfx773", "sfx774", "sfx775", "sfx776", "sfx777", "sfx778", "sfx779", "sfx780", "sfx781", "sfx782", "sfx783", "sfx784", "sfx785", "sfx786", "sfx787", "sfx788", "sfx789", "sfx790", "sfx791", "sfx792", "sfx793", "sfx794", "sfx795", "sfx796", "sfx797", "sfx798", "sfx799", "sfx800", "sfx801", "sfx802", "sfx803", "sfx804", "sfx805", "sfx806", "sfx807", "sfx808", "sfx809", "sfx810", "sfx811", "sfx812", "sfx813", "sfx814", "sfx815", "sfx816", "sfx817", "sfx818", "sfx819", "sfx820", "sfx821", "sfx822", "sfx823", "sfx824", "sfx825", "sfx826", "sfx827", "sfx828", "sfx829", "sfx830", "sfx831", "sfx832", "sfx833", "sfx834", "sfx835", "sfx836", "sfx837", "sfx838", "sfx839", "sfx840", "sfx841", "sfx842", "sfx843", "sfx844", "sfx845", "sfx846", "sfx847", "sfx848", "sfx849", "sfx850", "sfx851", "sfx852", "sfx853", "sfx854", "sfx855", "sfx856", "sfx857", "sfx858", "sfx859", "sfx860", "sfx861", "sfx862", "sfx863", "sfx864", "sfx865", "sfx866", "sfx867", "sfx868", "sfx869", "sfx870", "sfx871", "sfx872", "sfx873", "sfx874", "sfx875", "sfx876", "sfx877", "sfx878", "sfx879", "sfx880", "sfx881", "sfx882", "sfx883", "sfx884", "sfx885", "sfx886", "sfx887", "sfx888", "sfx889", "sfx890", "sfx891", "sfx892", "sfx893", "sfx894", "sfx895", "sfx896", "sfx897", "sfx898", "sfx899", "sfx900", "sfx901", "sfx902", "sfx903", "sfx904", "sfx905", "sfx906", "sfx907", "sfx908", "sfx909", "sfx910", "sfx911", "sfx912", "sfx913", "sfx914", "sfx915", "sfx916", "sfx917", "sfx918", "sfx919", "sfx920", "sfx921", "sfx922", "sfx923", "sfx924", "sfx925", "sfx926", "sfx927", "sfx928", "sfx929", "sfx930", "sfx931", "sfx932", "sfx933", "sfx934", "sfx935", "sfx936", "sfx937", "sfx938", "sfx939", "sfx940", "sfx941", "sfx942", "sfx943", "sfx944", "sfx945", "sfx946", "sfx947", "sfx948", "sfx949", "sfx950", "sfx951", "sfx952", "sfx953", "sfx954", "sfx955", "sfx956", "sfx957", "sfx958", "sfx959", "sfx960", "sfx961", "sfx962", "sfx963", "sfx964", "sfx965", "sfx966", "sfx967", "sfx968", "sfx969", "sfx970", "sfx971", "sfx972", "sfx973", "sfx974", "sfx975", "sfx976", "sfx977", "sfx978", "sfx979", "sfx980", "sfx981", "sfx982", "sfx983", "sfx984", "sfx985", "sfx986", "sfx987", "sfx988", "sfx989", "sfx990", "sfx991", "sfx992", "sfx993", "sfx994", "sfx995", "sfx996", "sfx997", "sfx998", "sfx999", "bgm000", "bgm001", "bgm002", "bgm003", "bgm004", "bgm005", "bgm006", "bgm007", "bgm008", "bgm009", "bgm010", "bgm011", "bgm012", "bgm013", "bgm014", "bgm015", "bgm016", "bgm017", "bgm018", "bgm019", "bgm020", "bgm021", "bgm022", "bgm023", "bgm024", "bgm025", "bgm026", "bgm027", "bgm028", "bgm029", "bgm030", "bgm031", "bgm032", "bgm033", "bgm034", "bgm035", "bgm036", "bgm037", "bgm038", "bgm039", "bgm040", "bgm041", "bgm042", "bgm043", "bgm044", "bgm045", "bgm046", "bgm047", "bgm048", "bgm049", "bgm050", "bgm051", "bgm052", "bgm053", "bgm054", "bgm055", "bgm056", "bgm057", "bgm058", "bgm059", "bgm060", "bgm061", "bgm062", "bgm063", "bgm064", "bgm065", "bgm066", "bgm067", "bgm068", "bgm069", "bgm070", "bgm071", "bgm072", "bgm073", "bgm074", "bgm075", "bgm076", "bgm077", "bgm078", "bgm079", "bgm080", "bgm081", "bgm082", "bgm083", "bgm084", "bgm085", "bgm086", "bgm087", "bgm088", "bgm089", "bgm090", "bgm091", "bgm092", "bgm093", "bgm094", "bgm095", "bgm096", "bgm097", "bgm098", "bgm099", "bgm100", "bgm101", "bgm102", "bgm103", "bgm104", "bgm105", "bgm106", "bgm107", "bgm108", "bgm109", "bgm110", "bgm111", "bgm112", "bgm113", "bgm114", "bgm115", "bgm116", "bgm117", "bgm118", "bgm119", "bgm120", "bgm121", "bgm122", "bgm123", "bgm124", "bgm125", "bgm126", "bgm127", "bgm128", "bgm129", "bgm130", "bgm131", "bgm132", "bgm133", "bgm134", "bgm135", "bgm136", "bgm137", "bgm138", "bgm139", "bgm140", "bgm141", "bgm142", "bgm143", "bgm144", "bgm145", "bgm146", "bgm147", "bgm148", "bgm149", "bgm150", "bgm151", "bgm152", "bgm153", "bgm154", "bgm155", "bgm156", "bgm157", "bgm158", "bgm159", "bgm160", "bgm161", "bgm162", "bgm163", "bgm164", "bgm165", "bgm166", "bgm167", "bgm168", "bgm169", "bgm170", "bgm171", "bgm172", "bgm173", "bgm174", "bgm175", "bgm176", "bgm177", "bgm178", "bgm179", "bgm180", "bgm181", "bgm182", "bgm183", "bgm184", "bgm185", "bgm186", "bgm187", "bgm188", "bgm189", "bgm190", "bgm191", "bgm192", "bgm193", "bgm194", "bgm195", "bgm196", "bgm197", "bgm198", "bgm199", "bgm200", "bgm201", "bgm202", "bgm203", "bgm204", "bgm205", "bgm206", "bgm207", "bgm208", "bgm209", "bgm210", "bgm211", "bgm212", "bgm213", "bgm214", "bgm215", "bgm216", "bgm217", "bgm218", "bgm219", "bgm220", "bgm221", "bgm222", "bgm223", "bgm224", "bgm225", "bgm226", "bgm227", "bgm228", "bgm229", "bgm230", "bgm231", "bgm232", "bgm233", "bgm234", "bgm235", "bgm236", "bgm237", "bgm238", "bgm239", "bgm240", "bgm241", "bgm242", "bgm243", "bgm244", "bgm245", "bgm246", "bgm247", "bgm248", "bgm249", "bgm250", "bgm251", "bgm252", "bgm253", "bgm254", "bgm255", "bgm256", "bgm257", "bgm258", "bgm259", "bgm260", "bgm261", "bgm262", "bgm263", "bgm264", "bgm265", "bgm266", "bgm267", "bgm268", "bgm269", "bgm270", "bgm271", "bgm272", "bgm273", "bgm274", "bgm275", "bgm276", "bgm277", "bgm278", "bgm279", "bgm280", "bgm281", "bgm282", "bgm283", "bgm284", "bgm285", "bgm286", "bgm287", "bgm288", "bgm289", "bgm290", "bgm291", "bgm292", "bgm293", "bgm294", "bgm295", "bgm296", "bgm297", "bgm298", "bgm299", "bgm300", "bgm301", "bgm302", "bgm303", "bgm304", "bgm305", "bgm306", "bgm307", "bgm308", "bgm309", "bgm310", "bgm311", "bgm312", "bgm313", "bgm314", "bgm315", "bgm316", "bgm317", "bgm318", "bgm319", "bgm320", "bgm321", "bgm322", "bgm323", "bgm324", "bgm325", "bgm326", "bgm327", "bgm328", "bgm329", "bgm330", "bgm331", "bgm332", "bgm333", "bgm334", "bgm335", "bgm336", "bgm337", "bgm338", "bgm339", "bgm340", "bgm341", "bgm342", "bgm343", "bgm344", "bgm345", "bgm346", "bgm347", "bgm348", "bgm349", "bgm350", "bgm351", "bgm352", "bgm353", "bgm354", "bgm355", "bgm356", "bgm357", "bgm358", "bgm359", "bgm360", "bgm361", "bgm362", "bgm363", "bgm364", "bgm365", "bgm366", "bgm367", "bgm368", "bgm369", "bgm370", "bgm371", "bgm372", "bgm373", "bgm374", "bgm375", "bgm376", "bgm377", "bgm378", "bgm379", "bgm380", "bgm381", "bgm382", "bgm383", "bgm384", "bgm385", "bgm386", "bgm387", "bgm388", "bgm389", "bgm390", "bgm391", "bgm392", "bgm393", "bgm394", "bgm395", "bgm396", "bgm397", "bgm398", "bgm399", "bgm400", "bgm401", "bgm402", "bgm403", "bgm404", "bgm405", "bgm406", "bgm407", "bgm408", "bgm409", "bgm410", "bgm411", "bgm412", "bgm413", "bgm414", "bgm415", "bgm416", "bgm417", "bgm418", "bgm419", "bgm420", "bgm421", "bgm422", "bgm423", "bgm424", "bgm425", "bgm426", "bgm427", "bgm428", "bgm429", "bgm430", "bgm431", "bgm432", "bgm433", "bgm434", "bgm435", "bgm436", "bgm437", "bgm438", "bgm439", "bgm440", "bgm441", "bgm442", "bgm443", "bgm444", "bgm445", "bgm446", "bgm447", "bgm448", "bgm449", "bgm450", "bgm451", "bgm452", "bgm453", "bgm454", "bgm455", "bgm456", "bgm457", "bgm458", "bgm459", "bgm460", "bgm461", "bgm462", "bgm463", "bgm464", "bgm465", "bgm466", "bgm467", "bgm468", "bgm469", "bgm470", "bgm471", "bgm472", "bgm473", "bgm474", "bgm475", "bgm476", "bgm477", "bgm478", "bgm479", "bgm480", "bgm481", "bgm482", "bgm483", "bgm484", "bgm485", "bgm486", "bgm487", "bgm488", "bgm489", "bgm490", "bgm491", "bgm492", "bgm493", "bgm494", "bgm495", "bgm496", "bgm497", "bgm498", "bgm499", "bgm500", "bgm501", "bgm502", "bgm503", "bgm504", "bgm505", "bgm506", "bgm507", "bgm508", "bgm509", "bgm510", "bgm511", "bgm512", "bgm513", "bgm514", "bgm515", "bgm516", "bgm517", "bgm518", "bgm519", "bgm520", "bgm521", "bgm522", "bgm523", "bgm524", "bgm525", "bgm526", "bgm527", "bgm528", "bgm529", "bgm530", "bgm531", "bgm532", "bgm533", "bgm534", "bgm535", "bgm536", "bgm537", "bgm538", "bgm539", "bgm540", "bgm541", "bgm542", "bgm543", "bgm544", "bgm545", "bgm546", "bgm547", "bgm548", "bgm549", "bgm550", "bgm551", "bgm552", "bgm553", "bgm554", "bgm555", "bgm556", "bgm557", "bgm558", "bgm559", "bgm560", "bgm561", "bgm562", "bgm563", "bgm564", "bgm565", "bgm566", "bgm567", "bgm568", "bgm569", "bgm570", "bgm571", "bgm572", "bgm573", "bgm574", "bgm575", "bgm576", "bgm577", "bgm578", "bgm579", "bgm580", "bgm581", "bgm582", "bgm583", "bgm584", "bgm585", "bgm586", "bgm587", "bgm588", "bgm589", "bgm590", "bgm591", "bgm592", "bgm593", "bgm594", "bgm595", "bgm596", "bgm597", "bgm598", "bgm599", "bgm600", "bgm601", "bgm602", "bgm603", "bgm604", "bgm605", "bgm606", "bgm607", "bgm608", "bgm609", "bgm610", "bgm611", "bgm612", "bgm613", "bgm614", "bgm615", "bgm616", "bgm617", "bgm618", "bgm619", "bgm620", "bgm621", "bgm622", "bgm623", "bgm624", "bgm625", "bgm626", "bgm627", "bgm628", "bgm629", "bgm630", "bgm631", "bgm632", "bgm633", "bgm634", "bgm635", "bgm636", "bgm637", "bgm638", "bgm639", "bgm640", "bgm641", "bgm642", "bgm643", "bgm644", "bgm645", "bgm646", "bgm647", "bgm648", "bgm649", "bgm650", "bgm651", "bgm652", "bgm653", "bgm654", "bgm655", "bgm656", "bgm657", "bgm658", "bgm659", "bgm660", "bgm661", "bgm662", "bgm663", "bgm664", "bgm665", "bgm666", "bgm667", "bgm668", "bgm669", "bgm670", "bgm671", "bgm672", "bgm673", "bgm674", "bgm675", "bgm676", "bgm677", "bgm678", "bgm679", "bgm680", "bgm681", "bgm682", "bgm683", "bgm684", "bgm685", "bgm686", "bgm687", "bgm688", "bgm689", "bgm690", "bgm691", "bgm692", "bgm693", "bgm694", "bgm695", "bgm696", "bgm697", "bgm698", "bgm699", "bgm700", "bgm701", "bgm702", "bgm703", "bgm704", "bgm705", "bgm706", "bgm707", "bgm708", "bgm709", "bgm710", "bgm711", "bgm712", "bgm713", "bgm714", "bgm715", "bgm716", "bgm717", "bgm718", "bgm719", "bgm720", "bgm721", "bgm722", "bgm723", "bgm724", "bgm725", "bgm726", "bgm727", "bgm728", "bgm729", "bgm730", "bgm731", "bgm732", "bgm733", "bgm734", "bgm735", "bgm736", "bgm737", "bgm738", "bgm739", "bgm740", "bgm741", "bgm742", "bgm743", "bgm744", "bgm745", "bgm746", "bgm747", "bgm748", "bgm749", "bgm750", "bgm751", "bgm752", "bgm753", "bgm754", "bgm755", "bgm756", "bgm757", "bgm758", "bgm759", "bgm760", "bgm761", "bgm762", "bgm763", "bgm764", "bgm765", "bgm766", "bgm767", "bgm768", "bgm769", "bgm770", "bgm771", "bgm772", "bgm773", "bgm774", "bgm775", "bgm776", "bgm777", "bgm778", "bgm779", "bgm780", "bgm781", "bgm782", "bgm783", "bgm784", "bgm785", "bgm786", "bgm787", "bgm788", "bgm789", "bgm790", "bgm791", "bgm792", "bgm793", "bgm794", "bgm795", "bgm796", "bgm797", "bgm798", "bgm799", "bgm800", "bgm801", "bgm802", "bgm803", "bgm804", "bgm805", "bgm806", "bgm807", "bgm808", "bgm809", "bgm810", "bgm811", "bgm812", "bgm813", "bgm814", "bgm815", "bgm816", "bgm817", "bgm818", "bgm819", "bgm820", "bgm821", "bgm822", "bgm823", "bgm824", "bgm825", "bgm826", "bgm827", "bgm828", "bgm829", "bgm830", "bgm831", "bgm832", "bgm833", "bgm834", "bgm835", "bgm836", "bgm837", "bgm838", "bgm839", "bgm840", "bgm841", "bgm842", "bgm843", "bgm844", "bgm845", "bgm846", "bgm847", "bgm848", "bgm849", "bgm850", "bgm851", "bgm852", "bgm853", "bgm854", "bgm855", "bgm856", "bgm857", "bgm858", "bgm859", "bgm860", "bgm861", "bgm862", "bgm863", "bgm864", "bgm865", "bgm866", "bgm867", "bgm868", "bgm869", "bgm870", "bgm871", "bgm872", "bgm873", "bgm874", "bgm875", "bgm876", "bgm877", "bgm878", "bgm879", "bgm880", "bgm881", "bgm882", "bgm883", "bgm884", "bgm885", "bgm886", "bgm887", "bgm888", "bgm889", "bgm890", "bgm891", "bgm892", "bgm893", "bgm894", "bgm895", "bgm896", "bgm897", "bgm898", "bgm899", "bgm900", "bgm901", "bgm902", "bgm903", "bgm904", "bgm905", "bgm906", "bgm907", "bgm908", "bgm909", "bgm910", "bgm911", "bgm912", "bgm913", "bgm914", "bgm915", "bgm916", "bgm917", "bgm918", "bgm919", "bgm920", "bgm921", "bgm922", "bgm923", "bgm924", "bgm925", "bgm926", "bgm927", "bgm928", "bgm929", "bgm930", "bgm931", "bgm932", "bgm933", "bgm934", "bgm935", "bgm936", "bgm937", "bgm938", "bgm939", "bgm940", "bgm941", "bgm942", "bgm943", "bgm944", "bgm945", "bgm946", "bgm947", "bgm948", "bgm949", "bgm950", "bgm951", "bgm952", "bgm953", "bgm954", "bgm955", "bgm956", "bgm957", "bgm958", "bgm959", "bgm960", "bgm961", "bgm962", "bgm963", "bgm964", "bgm965", "bgm966", "bgm967", "bgm968", "bgm969", "bgm970", "bgm971", "bgm972", "bgm973", "bgm974", "bgm975", "bgm976", "bgm977", "bgm978", "bgm979", "bgm980", "bgm981", "bgm982", "bgm983", "bgm984", "bgm985", "bgm986", "bgm987", "bgm988", "bgm989", "bgm990", "bgm991", "bgm992", "bgm993", "bgm994", "bgm995", "bgm996", "bgm997", "bgm998", "bgm999","cancel","checkpoint","restart","win","message","again"];
    const reg_commands = /[\p{Z}\s]*(sfx000|sfx001|sfx002|sfx003|sfx004|sfx005|sfx006|sfx007|sfx008|sfx009|sfx010|sfx011|sfx012|sfx013|sfx014|sfx015|sfx016|sfx017|sfx018|sfx019|sfx020|sfx021|sfx022|sfx023|sfx024|sfx025|sfx026|sfx027|sfx028|sfx029|sfx030|sfx031|sfx032|sfx033|sfx034|sfx035|sfx036|sfx037|sfx038|sfx039|sfx040|sfx041|sfx042|sfx043|sfx044|sfx045|sfx046|sfx047|sfx048|sfx049|sfx050|sfx051|sfx052|sfx053|sfx054|sfx055|sfx056|sfx057|sfx058|sfx059|sfx060|sfx061|sfx062|sfx063|sfx064|sfx065|sfx066|sfx067|sfx068|sfx069|sfx070|sfx071|sfx072|sfx073|sfx074|sfx075|sfx076|sfx077|sfx078|sfx079|sfx080|sfx081|sfx082|sfx083|sfx084|sfx085|sfx086|sfx087|sfx088|sfx089|sfx090|sfx091|sfx092|sfx093|sfx094|sfx095|sfx096|sfx097|sfx098|sfx099|sfx100|sfx101|sfx102|sfx103|sfx104|sfx105|sfx106|sfx107|sfx108|sfx109|sfx110|sfx111|sfx112|sfx113|sfx114|sfx115|sfx116|sfx117|sfx118|sfx119|sfx120|sfx121|sfx122|sfx123|sfx124|sfx125|sfx126|sfx127|sfx128|sfx129|sfx130|sfx131|sfx132|sfx133|sfx134|sfx135|sfx136|sfx137|sfx138|sfx139|sfx140|sfx141|sfx142|sfx143|sfx144|sfx145|sfx146|sfx147|sfx148|sfx149|sfx150|sfx151|sfx152|sfx153|sfx154|sfx155|sfx156|sfx157|sfx158|sfx159|sfx160|sfx161|sfx162|sfx163|sfx164|sfx165|sfx166|sfx167|sfx168|sfx169|sfx170|sfx171|sfx172|sfx173|sfx174|sfx175|sfx176|sfx177|sfx178|sfx179|sfx180|sfx181|sfx182|sfx183|sfx184|sfx185|sfx186|sfx187|sfx188|sfx189|sfx190|sfx191|sfx192|sfx193|sfx194|sfx195|sfx196|sfx197|sfx198|sfx199|sfx200|sfx201|sfx202|sfx203|sfx204|sfx205|sfx206|sfx207|sfx208|sfx209|sfx210|sfx211|sfx212|sfx213|sfx214|sfx215|sfx216|sfx217|sfx218|sfx219|sfx220|sfx221|sfx222|sfx223|sfx224|sfx225|sfx226|sfx227|sfx228|sfx229|sfx230|sfx231|sfx232|sfx233|sfx234|sfx235|sfx236|sfx237|sfx238|sfx239|sfx240|sfx241|sfx242|sfx243|sfx244|sfx245|sfx246|sfx247|sfx248|sfx249|sfx250|sfx251|sfx252|sfx253|sfx254|sfx255|sfx256|sfx257|sfx258|sfx259|sfx260|sfx261|sfx262|sfx263|sfx264|sfx265|sfx266|sfx267|sfx268|sfx269|sfx270|sfx271|sfx272|sfx273|sfx274|sfx275|sfx276|sfx277|sfx278|sfx279|sfx280|sfx281|sfx282|sfx283|sfx284|sfx285|sfx286|sfx287|sfx288|sfx289|sfx290|sfx291|sfx292|sfx293|sfx294|sfx295|sfx296|sfx297|sfx298|sfx299|sfx300|sfx301|sfx302|sfx303|sfx304|sfx305|sfx306|sfx307|sfx308|sfx309|sfx310|sfx311|sfx312|sfx313|sfx314|sfx315|sfx316|sfx317|sfx318|sfx319|sfx320|sfx321|sfx322|sfx323|sfx324|sfx325|sfx326|sfx327|sfx328|sfx329|sfx330|sfx331|sfx332|sfx333|sfx334|sfx335|sfx336|sfx337|sfx338|sfx339|sfx340|sfx341|sfx342|sfx343|sfx344|sfx345|sfx346|sfx347|sfx348|sfx349|sfx350|sfx351|sfx352|sfx353|sfx354|sfx355|sfx356|sfx357|sfx358|sfx359|sfx360|sfx361|sfx362|sfx363|sfx364|sfx365|sfx366|sfx367|sfx368|sfx369|sfx370|sfx371|sfx372|sfx373|sfx374|sfx375|sfx376|sfx377|sfx378|sfx379|sfx380|sfx381|sfx382|sfx383|sfx384|sfx385|sfx386|sfx387|sfx388|sfx389|sfx390|sfx391|sfx392|sfx393|sfx394|sfx395|sfx396|sfx397|sfx398|sfx399|sfx400|sfx401|sfx402|sfx403|sfx404|sfx405|sfx406|sfx407|sfx408|sfx409|sfx410|sfx411|sfx412|sfx413|sfx414|sfx415|sfx416|sfx417|sfx418|sfx419|sfx420|sfx421|sfx422|sfx423|sfx424|sfx425|sfx426|sfx427|sfx428|sfx429|sfx430|sfx431|sfx432|sfx433|sfx434|sfx435|sfx436|sfx437|sfx438|sfx439|sfx440|sfx441|sfx442|sfx443|sfx444|sfx445|sfx446|sfx447|sfx448|sfx449|sfx450|sfx451|sfx452|sfx453|sfx454|sfx455|sfx456|sfx457|sfx458|sfx459|sfx460|sfx461|sfx462|sfx463|sfx464|sfx465|sfx466|sfx467|sfx468|sfx469|sfx470|sfx471|sfx472|sfx473|sfx474|sfx475|sfx476|sfx477|sfx478|sfx479|sfx480|sfx481|sfx482|sfx483|sfx484|sfx485|sfx486|sfx487|sfx488|sfx489|sfx490|sfx491|sfx492|sfx493|sfx494|sfx495|sfx496|sfx497|sfx498|sfx499|sfx500|sfx501|sfx502|sfx503|sfx504|sfx505|sfx506|sfx507|sfx508|sfx509|sfx510|sfx511|sfx512|sfx513|sfx514|sfx515|sfx516|sfx517|sfx518|sfx519|sfx520|sfx521|sfx522|sfx523|sfx524|sfx525|sfx526|sfx527|sfx528|sfx529|sfx530|sfx531|sfx532|sfx533|sfx534|sfx535|sfx536|sfx537|sfx538|sfx539|sfx540|sfx541|sfx542|sfx543|sfx544|sfx545|sfx546|sfx547|sfx548|sfx549|sfx550|sfx551|sfx552|sfx553|sfx554|sfx555|sfx556|sfx557|sfx558|sfx559|sfx560|sfx561|sfx562|sfx563|sfx564|sfx565|sfx566|sfx567|sfx568|sfx569|sfx570|sfx571|sfx572|sfx573|sfx574|sfx575|sfx576|sfx577|sfx578|sfx579|sfx580|sfx581|sfx582|sfx583|sfx584|sfx585|sfx586|sfx587|sfx588|sfx589|sfx590|sfx591|sfx592|sfx593|sfx594|sfx595|sfx596|sfx597|sfx598|sfx599|sfx600|sfx601|sfx602|sfx603|sfx604|sfx605|sfx606|sfx607|sfx608|sfx609|sfx610|sfx611|sfx612|sfx613|sfx614|sfx615|sfx616|sfx617|sfx618|sfx619|sfx620|sfx621|sfx622|sfx623|sfx624|sfx625|sfx626|sfx627|sfx628|sfx629|sfx630|sfx631|sfx632|sfx633|sfx634|sfx635|sfx636|sfx637|sfx638|sfx639|sfx640|sfx641|sfx642|sfx643|sfx644|sfx645|sfx646|sfx647|sfx648|sfx649|sfx650|sfx651|sfx652|sfx653|sfx654|sfx655|sfx656|sfx657|sfx658|sfx659|sfx660|sfx661|sfx662|sfx663|sfx664|sfx665|sfx666|sfx667|sfx668|sfx669|sfx670|sfx671|sfx672|sfx673|sfx674|sfx675|sfx676|sfx677|sfx678|sfx679|sfx680|sfx681|sfx682|sfx683|sfx684|sfx685|sfx686|sfx687|sfx688|sfx689|sfx690|sfx691|sfx692|sfx693|sfx694|sfx695|sfx696|sfx697|sfx698|sfx699|sfx700|sfx701|sfx702|sfx703|sfx704|sfx705|sfx706|sfx707|sfx708|sfx709|sfx710|sfx711|sfx712|sfx713|sfx714|sfx715|sfx716|sfx717|sfx718|sfx719|sfx720|sfx721|sfx722|sfx723|sfx724|sfx725|sfx726|sfx727|sfx728|sfx729|sfx730|sfx731|sfx732|sfx733|sfx734|sfx735|sfx736|sfx737|sfx738|sfx739|sfx740|sfx741|sfx742|sfx743|sfx744|sfx745|sfx746|sfx747|sfx748|sfx749|sfx750|sfx751|sfx752|sfx753|sfx754|sfx755|sfx756|sfx757|sfx758|sfx759|sfx760|sfx761|sfx762|sfx763|sfx764|sfx765|sfx766|sfx767|sfx768|sfx769|sfx770|sfx771|sfx772|sfx773|sfx774|sfx775|sfx776|sfx777|sfx778|sfx779|sfx780|sfx781|sfx782|sfx783|sfx784|sfx785|sfx786|sfx787|sfx788|sfx789|sfx790|sfx791|sfx792|sfx793|sfx794|sfx795|sfx796|sfx797|sfx798|sfx799|sfx800|sfx801|sfx802|sfx803|sfx804|sfx805|sfx806|sfx807|sfx808|sfx809|sfx810|sfx811|sfx812|sfx813|sfx814|sfx815|sfx816|sfx817|sfx818|sfx819|sfx820|sfx821|sfx822|sfx823|sfx824|sfx825|sfx826|sfx827|sfx828|sfx829|sfx830|sfx831|sfx832|sfx833|sfx834|sfx835|sfx836|sfx837|sfx838|sfx839|sfx840|sfx841|sfx842|sfx843|sfx844|sfx845|sfx846|sfx847|sfx848|sfx849|sfx850|sfx851|sfx852|sfx853|sfx854|sfx855|sfx856|sfx857|sfx858|sfx859|sfx860|sfx861|sfx862|sfx863|sfx864|sfx865|sfx866|sfx867|sfx868|sfx869|sfx870|sfx871|sfx872|sfx873|sfx874|sfx875|sfx876|sfx877|sfx878|sfx879|sfx880|sfx881|sfx882|sfx883|sfx884|sfx885|sfx886|sfx887|sfx888|sfx889|sfx890|sfx891|sfx892|sfx893|sfx894|sfx895|sfx896|sfx897|sfx898|sfx899|sfx900|sfx901|sfx902|sfx903|sfx904|sfx905|sfx906|sfx907|sfx908|sfx909|sfx910|sfx911|sfx912|sfx913|sfx914|sfx915|sfx916|sfx917|sfx918|sfx919|sfx920|sfx921|sfx922|sfx923|sfx924|sfx925|sfx926|sfx927|sfx928|sfx929|sfx930|sfx931|sfx932|sfx933|sfx934|sfx935|sfx936|sfx937|sfx938|sfx939|sfx940|sfx941|sfx942|sfx943|sfx944|sfx945|sfx946|sfx947|sfx948|sfx949|sfx950|sfx951|sfx952|sfx953|sfx954|sfx955|sfx956|sfx957|sfx958|sfx959|sfx960|sfx961|sfx962|sfx963|sfx964|sfx965|sfx966|sfx967|sfx968|sfx969|sfx970|sfx971|sfx972|sfx973|sfx974|sfx975|sfx976|sfx977|sfx978|sfx979|sfx980|sfx981|sfx982|sfx983|sfx984|sfx985|sfx986|sfx987|sfx988|sfx989|sfx990|sfx991|sfx992|sfx993|sfx994|sfx995|sfx996|sfx997|sfx998|sfx999|bgm000|bgm001|bgm002|bgm003|bgm004|bgm005|bgm006|bgm007|bgm008|bgm009|bgm010|bgm011|bgm012|bgm013|bgm014|bgm015|bgm016|bgm017|bgm018|bgm019|bgm020|bgm021|bgm022|bgm023|bgm024|bgm025|bgm026|bgm027|bgm028|bgm029|bgm030|bgm031|bgm032|bgm033|bgm034|bgm035|bgm036|bgm037|bgm038|bgm039|bgm040|bgm041|bgm042|bgm043|bgm044|bgm045|bgm046|bgm047|bgm048|bgm049|bgm050|bgm051|bgm052|bgm053|bgm054|bgm055|bgm056|bgm057|bgm058|bgm059|bgm060|bgm061|bgm062|bgm063|bgm064|bgm065|bgm066|bgm067|bgm068|bgm069|bgm070|bgm071|bgm072|bgm073|bgm074|bgm075|bgm076|bgm077|bgm078|bgm079|bgm080|bgm081|bgm082|bgm083|bgm084|bgm085|bgm086|bgm087|bgm088|bgm089|bgm090|bgm091|bgm092|bgm093|bgm094|bgm095|bgm096|bgm097|bgm098|bgm099|bgm100|bgm101|bgm102|bgm103|bgm104|bgm105|bgm106|bgm107|bgm108|bgm109|bgm110|bgm111|bgm112|bgm113|bgm114|bgm115|bgm116|bgm117|bgm118|bgm119|bgm120|bgm121|bgm122|bgm123|bgm124|bgm125|bgm126|bgm127|bgm128|bgm129|bgm130|bgm131|bgm132|bgm133|bgm134|bgm135|bgm136|bgm137|bgm138|bgm139|bgm140|bgm141|bgm142|bgm143|bgm144|bgm145|bgm146|bgm147|bgm148|bgm149|bgm150|bgm151|bgm152|bgm153|bgm154|bgm155|bgm156|bgm157|bgm158|bgm159|bgm160|bgm161|bgm162|bgm163|bgm164|bgm165|bgm166|bgm167|bgm168|bgm169|bgm170|bgm171|bgm172|bgm173|bgm174|bgm175|bgm176|bgm177|bgm178|bgm179|bgm180|bgm181|bgm182|bgm183|bgm184|bgm185|bgm186|bgm187|bgm188|bgm189|bgm190|bgm191|bgm192|bgm193|bgm194|bgm195|bgm196|bgm197|bgm198|bgm199|bgm200|bgm201|bgm202|bgm203|bgm204|bgm205|bgm206|bgm207|bgm208|bgm209|bgm210|bgm211|bgm212|bgm213|bgm214|bgm215|bgm216|bgm217|bgm218|bgm219|bgm220|bgm221|bgm222|bgm223|bgm224|bgm225|bgm226|bgm227|bgm228|bgm229|bgm230|bgm231|bgm232|bgm233|bgm234|bgm235|bgm236|bgm237|bgm238|bgm239|bgm240|bgm241|bgm242|bgm243|bgm244|bgm245|bgm246|bgm247|bgm248|bgm249|bgm250|bgm251|bgm252|bgm253|bgm254|bgm255|bgm256|bgm257|bgm258|bgm259|bgm260|bgm261|bgm262|bgm263|bgm264|bgm265|bgm266|bgm267|bgm268|bgm269|bgm270|bgm271|bgm272|bgm273|bgm274|bgm275|bgm276|bgm277|bgm278|bgm279|bgm280|bgm281|bgm282|bgm283|bgm284|bgm285|bgm286|bgm287|bgm288|bgm289|bgm290|bgm291|bgm292|bgm293|bgm294|bgm295|bgm296|bgm297|bgm298|bgm299|bgm300|bgm301|bgm302|bgm303|bgm304|bgm305|bgm306|bgm307|bgm308|bgm309|bgm310|bgm311|bgm312|bgm313|bgm314|bgm315|bgm316|bgm317|bgm318|bgm319|bgm320|bgm321|bgm322|bgm323|bgm324|bgm325|bgm326|bgm327|bgm328|bgm329|bgm330|bgm331|bgm332|bgm333|bgm334|bgm335|bgm336|bgm337|bgm338|bgm339|bgm340|bgm341|bgm342|bgm343|bgm344|bgm345|bgm346|bgm347|bgm348|bgm349|bgm350|bgm351|bgm352|bgm353|bgm354|bgm355|bgm356|bgm357|bgm358|bgm359|bgm360|bgm361|bgm362|bgm363|bgm364|bgm365|bgm366|bgm367|bgm368|bgm369|bgm370|bgm371|bgm372|bgm373|bgm374|bgm375|bgm376|bgm377|bgm378|bgm379|bgm380|bgm381|bgm382|bgm383|bgm384|bgm385|bgm386|bgm387|bgm388|bgm389|bgm390|bgm391|bgm392|bgm393|bgm394|bgm395|bgm396|bgm397|bgm398|bgm399|bgm400|bgm401|bgm402|bgm403|bgm404|bgm405|bgm406|bgm407|bgm408|bgm409|bgm410|bgm411|bgm412|bgm413|bgm414|bgm415|bgm416|bgm417|bgm418|bgm419|bgm420|bgm421|bgm422|bgm423|bgm424|bgm425|bgm426|bgm427|bgm428|bgm429|bgm430|bgm431|bgm432|bgm433|bgm434|bgm435|bgm436|bgm437|bgm438|bgm439|bgm440|bgm441|bgm442|bgm443|bgm444|bgm445|bgm446|bgm447|bgm448|bgm449|bgm450|bgm451|bgm452|bgm453|bgm454|bgm455|bgm456|bgm457|bgm458|bgm459|bgm460|bgm461|bgm462|bgm463|bgm464|bgm465|bgm466|bgm467|bgm468|bgm469|bgm470|bgm471|bgm472|bgm473|bgm474|bgm475|bgm476|bgm477|bgm478|bgm479|bgm480|bgm481|bgm482|bgm483|bgm484|bgm485|bgm486|bgm487|bgm488|bgm489|bgm490|bgm491|bgm492|bgm493|bgm494|bgm495|bgm496|bgm497|bgm498|bgm499|bgm500|bgm501|bgm502|bgm503|bgm504|bgm505|bgm506|bgm507|bgm508|bgm509|bgm510|bgm511|bgm512|bgm513|bgm514|bgm515|bgm516|bgm517|bgm518|bgm519|bgm520|bgm521|bgm522|bgm523|bgm524|bgm525|bgm526|bgm527|bgm528|bgm529|bgm530|bgm531|bgm532|bgm533|bgm534|bgm535|bgm536|bgm537|bgm538|bgm539|bgm540|bgm541|bgm542|bgm543|bgm544|bgm545|bgm546|bgm547|bgm548|bgm549|bgm550|bgm551|bgm552|bgm553|bgm554|bgm555|bgm556|bgm557|bgm558|bgm559|bgm560|bgm561|bgm562|bgm563|bgm564|bgm565|bgm566|bgm567|bgm568|bgm569|bgm570|bgm571|bgm572|bgm573|bgm574|bgm575|bgm576|bgm577|bgm578|bgm579|bgm580|bgm581|bgm582|bgm583|bgm584|bgm585|bgm586|bgm587|bgm588|bgm589|bgm590|bgm591|bgm592|bgm593|bgm594|bgm595|bgm596|bgm597|bgm598|bgm599|bgm600|bgm601|bgm602|bgm603|bgm604|bgm605|bgm606|bgm607|bgm608|bgm609|bgm610|bgm611|bgm612|bgm613|bgm614|bgm615|bgm616|bgm617|bgm618|bgm619|bgm620|bgm621|bgm622|bgm623|bgm624|bgm625|bgm626|bgm627|bgm628|bgm629|bgm630|bgm631|bgm632|bgm633|bgm634|bgm635|bgm636|bgm637|bgm638|bgm639|bgm640|bgm641|bgm642|bgm643|bgm644|bgm645|bgm646|bgm647|bgm648|bgm649|bgm650|bgm651|bgm652|bgm653|bgm654|bgm655|bgm656|bgm657|bgm658|bgm659|bgm660|bgm661|bgm662|bgm663|bgm664|bgm665|bgm666|bgm667|bgm668|bgm669|bgm670|bgm671|bgm672|bgm673|bgm674|bgm675|bgm676|bgm677|bgm678|bgm679|bgm680|bgm681|bgm682|bgm683|bgm684|bgm685|bgm686|bgm687|bgm688|bgm689|bgm690|bgm691|bgm692|bgm693|bgm694|bgm695|bgm696|bgm697|bgm698|bgm699|bgm700|bgm701|bgm702|bgm703|bgm704|bgm705|bgm706|bgm707|bgm708|bgm709|bgm710|bgm711|bgm712|bgm713|bgm714|bgm715|bgm716|bgm717|bgm718|bgm719|bgm720|bgm721|bgm722|bgm723|bgm724|bgm725|bgm726|bgm727|bgm728|bgm729|bgm730|bgm731|bgm732|bgm733|bgm734|bgm735|bgm736|bgm737|bgm738|bgm739|bgm740|bgm741|bgm742|bgm743|bgm744|bgm745|bgm746|bgm747|bgm748|bgm749|bgm750|bgm751|bgm752|bgm753|bgm754|bgm755|bgm756|bgm757|bgm758|bgm759|bgm760|bgm761|bgm762|bgm763|bgm764|bgm765|bgm766|bgm767|bgm768|bgm769|bgm770|bgm771|bgm772|bgm773|bgm774|bgm775|bgm776|bgm777|bgm778|bgm779|bgm780|bgm781|bgm782|bgm783|bgm784|bgm785|bgm786|bgm787|bgm788|bgm789|bgm790|bgm791|bgm792|bgm793|bgm794|bgm795|bgm796|bgm797|bgm798|bgm799|bgm800|bgm801|bgm802|bgm803|bgm804|bgm805|bgm806|bgm807|bgm808|bgm809|bgm810|bgm811|bgm812|bgm813|bgm814|bgm815|bgm816|bgm817|bgm818|bgm819|bgm820|bgm821|bgm822|bgm823|bgm824|bgm825|bgm826|bgm827|bgm828|bgm829|bgm830|bgm831|bgm832|bgm833|bgm834|bgm835|bgm836|bgm837|bgm838|bgm839|bgm840|bgm841|bgm842|bgm843|bgm844|bgm845|bgm846|bgm847|bgm848|bgm849|bgm850|bgm851|bgm852|bgm853|bgm854|bgm855|bgm856|bgm857|bgm858|bgm859|bgm860|bgm861|bgm862|bgm863|bgm864|bgm865|bgm866|bgm867|bgm868|bgm869|bgm870|bgm871|bgm872|bgm873|bgm874|bgm875|bgm876|bgm877|bgm878|bgm879|bgm880|bgm881|bgm882|bgm883|bgm884|bgm885|bgm886|bgm887|bgm888|bgm889|bgm890|bgm891|bgm892|bgm893|bgm894|bgm895|bgm896|bgm897|bgm898|bgm899|bgm900|bgm901|bgm902|bgm903|bgm904|bgm905|bgm906|bgm907|bgm908|bgm909|bgm910|bgm911|bgm912|bgm913|bgm914|bgm915|bgm916|bgm917|bgm918|bgm919|bgm920|bgm921|bgm922|bgm923|bgm924|bgm925|bgm926|bgm927|bgm928|bgm929|bgm930|bgm931|bgm932|bgm933|bgm934|bgm935|bgm936|bgm937|bgm938|bgm939|bgm940|bgm941|bgm942|bgm943|bgm944|bgm945|bgm946|bgm947|bgm948|bgm949|bgm950|bgm951|bgm952|bgm953|bgm954|bgm955|bgm956|bgm957|bgm958|bgm959|bgm960|bgm961|bgm962|bgm963|bgm964|bgm965|bgm966|bgm967|bgm968|bgm969|bgm970|bgm971|bgm972|bgm973|bgm974|bgm975|bgm976|bgm977|bgm978|bgm979|bgm980|bgm981|bgm982|bgm983|bgm984|bgm985|bgm986|bgm987|bgm988|bgm989|bgm990|bgm991|bgm992|bgm993|bgm994|bgm995|bgm996|bgm997|bgm998|bgm999|cancel|checkpoint|restart|win|message|again)[\p{Z}\s]*/u;
    const reg_name = /[\p{L}\p{N}_]+[\p{Z}\s]*/u;///\w*[a-uw-zA-UW-Z0-9_]/;
    const reg_number = /[\d]+/;
    const reg_soundseed = /\d+\b/u;
    const reg_mml = /^".*?"$/u; // based on mml-emitter.js : MMLParser
    const reg_spriterow = /[\.0-9]{5}[\p{Z}\s]*/u;
    const reg_sectionNames = /(objects|collisionlayers|legend|sounds|musics|rules|winconditions|levels)(?![\p{L}\p{N}_])[\p{Z}\s]*/u;
    const reg_equalsrow = /[\=]+/;
    const reg_notcommentstart = /[^\(]+/;
    const reg_match_until_commentstart_or_whitespace = /[^\p{Z}\s\()]+[\p{Z}\s]*/u;
    const reg_csv_separators = /[ \,]*/;
    const reg_soundverbs = /(move|action|create|destroy|cantmove)\b[\p{Z}\s]*/u;
    const reg_musicverbs = /(move|action|create|destroy|cantmove)\b[\p{Z}\s]*/u;
    const soundverbs_directional = ['move','cantmove'];
    const musicverbs_directional = ['move','cantmove'];
    const reg_soundverbs_directional = /(move|cantmove)\b[\p{Z}\s]*/u;
    const reg_soundverbs_nondirectional = /(action|create|destroy)\b[\p{Z}\s]*/u;
    const reg_musicverbs_directional = /(move|cantmove)\b[\p{Z}\s]*/u;
    const reg_musicverbs_nondirectional = /(action|create|destroy)\b[\p{Z}\s]*/u;
    const reg_soundevents = /(undo|restart|titlescreen|startgame|cancel|endgame|startlevel|endlevel|showmessage|closemessage|sfx000|sfx001|sfx002|sfx003|sfx004|sfx005|sfx006|sfx007|sfx008|sfx009|sfx010|sfx011|sfx012|sfx013|sfx014|sfx015|sfx016|sfx017|sfx018|sfx019|sfx020|sfx021|sfx022|sfx023|sfx024|sfx025|sfx026|sfx027|sfx028|sfx029|sfx030|sfx031|sfx032|sfx033|sfx034|sfx035|sfx036|sfx037|sfx038|sfx039|sfx040|sfx041|sfx042|sfx043|sfx044|sfx045|sfx046|sfx047|sfx048|sfx049|sfx050|sfx051|sfx052|sfx053|sfx054|sfx055|sfx056|sfx057|sfx058|sfx059|sfx060|sfx061|sfx062|sfx063|sfx064|sfx065|sfx066|sfx067|sfx068|sfx069|sfx070|sfx071|sfx072|sfx073|sfx074|sfx075|sfx076|sfx077|sfx078|sfx079|sfx080|sfx081|sfx082|sfx083|sfx084|sfx085|sfx086|sfx087|sfx088|sfx089|sfx090|sfx091|sfx092|sfx093|sfx094|sfx095|sfx096|sfx097|sfx098|sfx099|sfx100|sfx101|sfx102|sfx103|sfx104|sfx105|sfx106|sfx107|sfx108|sfx109|sfx110|sfx111|sfx112|sfx113|sfx114|sfx115|sfx116|sfx117|sfx118|sfx119|sfx120|sfx121|sfx122|sfx123|sfx124|sfx125|sfx126|sfx127|sfx128|sfx129|sfx130|sfx131|sfx132|sfx133|sfx134|sfx135|sfx136|sfx137|sfx138|sfx139|sfx140|sfx141|sfx142|sfx143|sfx144|sfx145|sfx146|sfx147|sfx148|sfx149|sfx150|sfx151|sfx152|sfx153|sfx154|sfx155|sfx156|sfx157|sfx158|sfx159|sfx160|sfx161|sfx162|sfx163|sfx164|sfx165|sfx166|sfx167|sfx168|sfx169|sfx170|sfx171|sfx172|sfx173|sfx174|sfx175|sfx176|sfx177|sfx178|sfx179|sfx180|sfx181|sfx182|sfx183|sfx184|sfx185|sfx186|sfx187|sfx188|sfx189|sfx190|sfx191|sfx192|sfx193|sfx194|sfx195|sfx196|sfx197|sfx198|sfx199|sfx200|sfx201|sfx202|sfx203|sfx204|sfx205|sfx206|sfx207|sfx208|sfx209|sfx210|sfx211|sfx212|sfx213|sfx214|sfx215|sfx216|sfx217|sfx218|sfx219|sfx220|sfx221|sfx222|sfx223|sfx224|sfx225|sfx226|sfx227|sfx228|sfx229|sfx230|sfx231|sfx232|sfx233|sfx234|sfx235|sfx236|sfx237|sfx238|sfx239|sfx240|sfx241|sfx242|sfx243|sfx244|sfx245|sfx246|sfx247|sfx248|sfx249|sfx250|sfx251|sfx252|sfx253|sfx254|sfx255|sfx256|sfx257|sfx258|sfx259|sfx260|sfx261|sfx262|sfx263|sfx264|sfx265|sfx266|sfx267|sfx268|sfx269|sfx270|sfx271|sfx272|sfx273|sfx274|sfx275|sfx276|sfx277|sfx278|sfx279|sfx280|sfx281|sfx282|sfx283|sfx284|sfx285|sfx286|sfx287|sfx288|sfx289|sfx290|sfx291|sfx292|sfx293|sfx294|sfx295|sfx296|sfx297|sfx298|sfx299|sfx300|sfx301|sfx302|sfx303|sfx304|sfx305|sfx306|sfx307|sfx308|sfx309|sfx310|sfx311|sfx312|sfx313|sfx314|sfx315|sfx316|sfx317|sfx318|sfx319|sfx320|sfx321|sfx322|sfx323|sfx324|sfx325|sfx326|sfx327|sfx328|sfx329|sfx330|sfx331|sfx332|sfx333|sfx334|sfx335|sfx336|sfx337|sfx338|sfx339|sfx340|sfx341|sfx342|sfx343|sfx344|sfx345|sfx346|sfx347|sfx348|sfx349|sfx350|sfx351|sfx352|sfx353|sfx354|sfx355|sfx356|sfx357|sfx358|sfx359|sfx360|sfx361|sfx362|sfx363|sfx364|sfx365|sfx366|sfx367|sfx368|sfx369|sfx370|sfx371|sfx372|sfx373|sfx374|sfx375|sfx376|sfx377|sfx378|sfx379|sfx380|sfx381|sfx382|sfx383|sfx384|sfx385|sfx386|sfx387|sfx388|sfx389|sfx390|sfx391|sfx392|sfx393|sfx394|sfx395|sfx396|sfx397|sfx398|sfx399|sfx400|sfx401|sfx402|sfx403|sfx404|sfx405|sfx406|sfx407|sfx408|sfx409|sfx410|sfx411|sfx412|sfx413|sfx414|sfx415|sfx416|sfx417|sfx418|sfx419|sfx420|sfx421|sfx422|sfx423|sfx424|sfx425|sfx426|sfx427|sfx428|sfx429|sfx430|sfx431|sfx432|sfx433|sfx434|sfx435|sfx436|sfx437|sfx438|sfx439|sfx440|sfx441|sfx442|sfx443|sfx444|sfx445|sfx446|sfx447|sfx448|sfx449|sfx450|sfx451|sfx452|sfx453|sfx454|sfx455|sfx456|sfx457|sfx458|sfx459|sfx460|sfx461|sfx462|sfx463|sfx464|sfx465|sfx466|sfx467|sfx468|sfx469|sfx470|sfx471|sfx472|sfx473|sfx474|sfx475|sfx476|sfx477|sfx478|sfx479|sfx480|sfx481|sfx482|sfx483|sfx484|sfx485|sfx486|sfx487|sfx488|sfx489|sfx490|sfx491|sfx492|sfx493|sfx494|sfx495|sfx496|sfx497|sfx498|sfx499|sfx500|sfx501|sfx502|sfx503|sfx504|sfx505|sfx506|sfx507|sfx508|sfx509|sfx510|sfx511|sfx512|sfx513|sfx514|sfx515|sfx516|sfx517|sfx518|sfx519|sfx520|sfx521|sfx522|sfx523|sfx524|sfx525|sfx526|sfx527|sfx528|sfx529|sfx530|sfx531|sfx532|sfx533|sfx534|sfx535|sfx536|sfx537|sfx538|sfx539|sfx540|sfx541|sfx542|sfx543|sfx544|sfx545|sfx546|sfx547|sfx548|sfx549|sfx550|sfx551|sfx552|sfx553|sfx554|sfx555|sfx556|sfx557|sfx558|sfx559|sfx560|sfx561|sfx562|sfx563|sfx564|sfx565|sfx566|sfx567|sfx568|sfx569|sfx570|sfx571|sfx572|sfx573|sfx574|sfx575|sfx576|sfx577|sfx578|sfx579|sfx580|sfx581|sfx582|sfx583|sfx584|sfx585|sfx586|sfx587|sfx588|sfx589|sfx590|sfx591|sfx592|sfx593|sfx594|sfx595|sfx596|sfx597|sfx598|sfx599|sfx600|sfx601|sfx602|sfx603|sfx604|sfx605|sfx606|sfx607|sfx608|sfx609|sfx610|sfx611|sfx612|sfx613|sfx614|sfx615|sfx616|sfx617|sfx618|sfx619|sfx620|sfx621|sfx622|sfx623|sfx624|sfx625|sfx626|sfx627|sfx628|sfx629|sfx630|sfx631|sfx632|sfx633|sfx634|sfx635|sfx636|sfx637|sfx638|sfx639|sfx640|sfx641|sfx642|sfx643|sfx644|sfx645|sfx646|sfx647|sfx648|sfx649|sfx650|sfx651|sfx652|sfx653|sfx654|sfx655|sfx656|sfx657|sfx658|sfx659|sfx660|sfx661|sfx662|sfx663|sfx664|sfx665|sfx666|sfx667|sfx668|sfx669|sfx670|sfx671|sfx672|sfx673|sfx674|sfx675|sfx676|sfx677|sfx678|sfx679|sfx680|sfx681|sfx682|sfx683|sfx684|sfx685|sfx686|sfx687|sfx688|sfx689|sfx690|sfx691|sfx692|sfx693|sfx694|sfx695|sfx696|sfx697|sfx698|sfx699|sfx700|sfx701|sfx702|sfx703|sfx704|sfx705|sfx706|sfx707|sfx708|sfx709|sfx710|sfx711|sfx712|sfx713|sfx714|sfx715|sfx716|sfx717|sfx718|sfx719|sfx720|sfx721|sfx722|sfx723|sfx724|sfx725|sfx726|sfx727|sfx728|sfx729|sfx730|sfx731|sfx732|sfx733|sfx734|sfx735|sfx736|sfx737|sfx738|sfx739|sfx740|sfx741|sfx742|sfx743|sfx744|sfx745|sfx746|sfx747|sfx748|sfx749|sfx750|sfx751|sfx752|sfx753|sfx754|sfx755|sfx756|sfx757|sfx758|sfx759|sfx760|sfx761|sfx762|sfx763|sfx764|sfx765|sfx766|sfx767|sfx768|sfx769|sfx770|sfx771|sfx772|sfx773|sfx774|sfx775|sfx776|sfx777|sfx778|sfx779|sfx780|sfx781|sfx782|sfx783|sfx784|sfx785|sfx786|sfx787|sfx788|sfx789|sfx790|sfx791|sfx792|sfx793|sfx794|sfx795|sfx796|sfx797|sfx798|sfx799|sfx800|sfx801|sfx802|sfx803|sfx804|sfx805|sfx806|sfx807|sfx808|sfx809|sfx810|sfx811|sfx812|sfx813|sfx814|sfx815|sfx816|sfx817|sfx818|sfx819|sfx820|sfx821|sfx822|sfx823|sfx824|sfx825|sfx826|sfx827|sfx828|sfx829|sfx830|sfx831|sfx832|sfx833|sfx834|sfx835|sfx836|sfx837|sfx838|sfx839|sfx840|sfx841|sfx842|sfx843|sfx844|sfx845|sfx846|sfx847|sfx848|sfx849|sfx850|sfx851|sfx852|sfx853|sfx854|sfx855|sfx856|sfx857|sfx858|sfx859|sfx860|sfx861|sfx862|sfx863|sfx864|sfx865|sfx866|sfx867|sfx868|sfx869|sfx870|sfx871|sfx872|sfx873|sfx874|sfx875|sfx876|sfx877|sfx878|sfx879|sfx880|sfx881|sfx882|sfx883|sfx884|sfx885|sfx886|sfx887|sfx888|sfx889|sfx890|sfx891|sfx892|sfx893|sfx894|sfx895|sfx896|sfx897|sfx898|sfx899|sfx900|sfx901|sfx902|sfx903|sfx904|sfx905|sfx906|sfx907|sfx908|sfx909|sfx910|sfx911|sfx912|sfx913|sfx914|sfx915|sfx916|sfx917|sfx918|sfx919|sfx920|sfx921|sfx922|sfx923|sfx924|sfx925|sfx926|sfx927|sfx928|sfx929|sfx930|sfx931|sfx932|sfx933|sfx934|sfx935|sfx936|sfx937|sfx938|sfx939|sfx940|sfx941|sfx942|sfx943|sfx944|sfx945|sfx946|sfx947|sfx948|sfx949|sfx950|sfx951|sfx952|sfx953|sfx954|sfx955|sfx956|sfx957|sfx958|sfx959|sfx960|sfx961|sfx962|sfx963|sfx964|sfx965|sfx966|sfx967|sfx968|sfx969|sfx970|sfx971|sfx972|sfx973|sfx974|sfx975|sfx976|sfx977|sfx978|sfx979|sfx980|sfx981|sfx982|sfx983|sfx984|sfx985|sfx986|sfx987|sfx988|sfx989|sfx990|sfx991|sfx992|sfx993|sfx994|sfx995|sfx996|sfx997|sfx998|sfx999)\b[\p{Z}\s]*/u;
    const reg_musicevents = /(undo|restart|titlescreen|startgame|cancel|endgame|startlevel|endlevel|showmessage|closemessage|bgm000|bgm001|bgm002|bgm003|bgm004|bgm005|bgm006|bgm007|bgm008|bgm009|bgm010|bgm011|bgm012|bgm013|bgm014|bgm015|bgm016|bgm017|bgm018|bgm019|bgm020|bgm021|bgm022|bgm023|bgm024|bgm025|bgm026|bgm027|bgm028|bgm029|bgm030|bgm031|bgm032|bgm033|bgm034|bgm035|bgm036|bgm037|bgm038|bgm039|bgm040|bgm041|bgm042|bgm043|bgm044|bgm045|bgm046|bgm047|bgm048|bgm049|bgm050|bgm051|bgm052|bgm053|bgm054|bgm055|bgm056|bgm057|bgm058|bgm059|bgm060|bgm061|bgm062|bgm063|bgm064|bgm065|bgm066|bgm067|bgm068|bgm069|bgm070|bgm071|bgm072|bgm073|bgm074|bgm075|bgm076|bgm077|bgm078|bgm079|bgm080|bgm081|bgm082|bgm083|bgm084|bgm085|bgm086|bgm087|bgm088|bgm089|bgm090|bgm091|bgm092|bgm093|bgm094|bgm095|bgm096|bgm097|bgm098|bgm099|bgm100|bgm101|bgm102|bgm103|bgm104|bgm105|bgm106|bgm107|bgm108|bgm109|bgm110|bgm111|bgm112|bgm113|bgm114|bgm115|bgm116|bgm117|bgm118|bgm119|bgm120|bgm121|bgm122|bgm123|bgm124|bgm125|bgm126|bgm127|bgm128|bgm129|bgm130|bgm131|bgm132|bgm133|bgm134|bgm135|bgm136|bgm137|bgm138|bgm139|bgm140|bgm141|bgm142|bgm143|bgm144|bgm145|bgm146|bgm147|bgm148|bgm149|bgm150|bgm151|bgm152|bgm153|bgm154|bgm155|bgm156|bgm157|bgm158|bgm159|bgm160|bgm161|bgm162|bgm163|bgm164|bgm165|bgm166|bgm167|bgm168|bgm169|bgm170|bgm171|bgm172|bgm173|bgm174|bgm175|bgm176|bgm177|bgm178|bgm179|bgm180|bgm181|bgm182|bgm183|bgm184|bgm185|bgm186|bgm187|bgm188|bgm189|bgm190|bgm191|bgm192|bgm193|bgm194|bgm195|bgm196|bgm197|bgm198|bgm199|bgm200|bgm201|bgm202|bgm203|bgm204|bgm205|bgm206|bgm207|bgm208|bgm209|bgm210|bgm211|bgm212|bgm213|bgm214|bgm215|bgm216|bgm217|bgm218|bgm219|bgm220|bgm221|bgm222|bgm223|bgm224|bgm225|bgm226|bgm227|bgm228|bgm229|bgm230|bgm231|bgm232|bgm233|bgm234|bgm235|bgm236|bgm237|bgm238|bgm239|bgm240|bgm241|bgm242|bgm243|bgm244|bgm245|bgm246|bgm247|bgm248|bgm249|bgm250|bgm251|bgm252|bgm253|bgm254|bgm255|bgm256|bgm257|bgm258|bgm259|bgm260|bgm261|bgm262|bgm263|bgm264|bgm265|bgm266|bgm267|bgm268|bgm269|bgm270|bgm271|bgm272|bgm273|bgm274|bgm275|bgm276|bgm277|bgm278|bgm279|bgm280|bgm281|bgm282|bgm283|bgm284|bgm285|bgm286|bgm287|bgm288|bgm289|bgm290|bgm291|bgm292|bgm293|bgm294|bgm295|bgm296|bgm297|bgm298|bgm299|bgm300|bgm301|bgm302|bgm303|bgm304|bgm305|bgm306|bgm307|bgm308|bgm309|bgm310|bgm311|bgm312|bgm313|bgm314|bgm315|bgm316|bgm317|bgm318|bgm319|bgm320|bgm321|bgm322|bgm323|bgm324|bgm325|bgm326|bgm327|bgm328|bgm329|bgm330|bgm331|bgm332|bgm333|bgm334|bgm335|bgm336|bgm337|bgm338|bgm339|bgm340|bgm341|bgm342|bgm343|bgm344|bgm345|bgm346|bgm347|bgm348|bgm349|bgm350|bgm351|bgm352|bgm353|bgm354|bgm355|bgm356|bgm357|bgm358|bgm359|bgm360|bgm361|bgm362|bgm363|bgm364|bgm365|bgm366|bgm367|bgm368|bgm369|bgm370|bgm371|bgm372|bgm373|bgm374|bgm375|bgm376|bgm377|bgm378|bgm379|bgm380|bgm381|bgm382|bgm383|bgm384|bgm385|bgm386|bgm387|bgm388|bgm389|bgm390|bgm391|bgm392|bgm393|bgm394|bgm395|bgm396|bgm397|bgm398|bgm399|bgm400|bgm401|bgm402|bgm403|bgm404|bgm405|bgm406|bgm407|bgm408|bgm409|bgm410|bgm411|bgm412|bgm413|bgm414|bgm415|bgm416|bgm417|bgm418|bgm419|bgm420|bgm421|bgm422|bgm423|bgm424|bgm425|bgm426|bgm427|bgm428|bgm429|bgm430|bgm431|bgm432|bgm433|bgm434|bgm435|bgm436|bgm437|bgm438|bgm439|bgm440|bgm441|bgm442|bgm443|bgm444|bgm445|bgm446|bgm447|bgm448|bgm449|bgm450|bgm451|bgm452|bgm453|bgm454|bgm455|bgm456|bgm457|bgm458|bgm459|bgm460|bgm461|bgm462|bgm463|bgm464|bgm465|bgm466|bgm467|bgm468|bgm469|bgm470|bgm471|bgm472|bgm473|bgm474|bgm475|bgm476|bgm477|bgm478|bgm479|bgm480|bgm481|bgm482|bgm483|bgm484|bgm485|bgm486|bgm487|bgm488|bgm489|bgm490|bgm491|bgm492|bgm493|bgm494|bgm495|bgm496|bgm497|bgm498|bgm499|bgm500|bgm501|bgm502|bgm503|bgm504|bgm505|bgm506|bgm507|bgm508|bgm509|bgm510|bgm511|bgm512|bgm513|bgm514|bgm515|bgm516|bgm517|bgm518|bgm519|bgm520|bgm521|bgm522|bgm523|bgm524|bgm525|bgm526|bgm527|bgm528|bgm529|bgm530|bgm531|bgm532|bgm533|bgm534|bgm535|bgm536|bgm537|bgm538|bgm539|bgm540|bgm541|bgm542|bgm543|bgm544|bgm545|bgm546|bgm547|bgm548|bgm549|bgm550|bgm551|bgm552|bgm553|bgm554|bgm555|bgm556|bgm557|bgm558|bgm559|bgm560|bgm561|bgm562|bgm563|bgm564|bgm565|bgm566|bgm567|bgm568|bgm569|bgm570|bgm571|bgm572|bgm573|bgm574|bgm575|bgm576|bgm577|bgm578|bgm579|bgm580|bgm581|bgm582|bgm583|bgm584|bgm585|bgm586|bgm587|bgm588|bgm589|bgm590|bgm591|bgm592|bgm593|bgm594|bgm595|bgm596|bgm597|bgm598|bgm599|bgm600|bgm601|bgm602|bgm603|bgm604|bgm605|bgm606|bgm607|bgm608|bgm609|bgm610|bgm611|bgm612|bgm613|bgm614|bgm615|bgm616|bgm617|bgm618|bgm619|bgm620|bgm621|bgm622|bgm623|bgm624|bgm625|bgm626|bgm627|bgm628|bgm629|bgm630|bgm631|bgm632|bgm633|bgm634|bgm635|bgm636|bgm637|bgm638|bgm639|bgm640|bgm641|bgm642|bgm643|bgm644|bgm645|bgm646|bgm647|bgm648|bgm649|bgm650|bgm651|bgm652|bgm653|bgm654|bgm655|bgm656|bgm657|bgm658|bgm659|bgm660|bgm661|bgm662|bgm663|bgm664|bgm665|bgm666|bgm667|bgm668|bgm669|bgm670|bgm671|bgm672|bgm673|bgm674|bgm675|bgm676|bgm677|bgm678|bgm679|bgm680|bgm681|bgm682|bgm683|bgm684|bgm685|bgm686|bgm687|bgm688|bgm689|bgm690|bgm691|bgm692|bgm693|bgm694|bgm695|bgm696|bgm697|bgm698|bgm699|bgm700|bgm701|bgm702|bgm703|bgm704|bgm705|bgm706|bgm707|bgm708|bgm709|bgm710|bgm711|bgm712|bgm713|bgm714|bgm715|bgm716|bgm717|bgm718|bgm719|bgm720|bgm721|bgm722|bgm723|bgm724|bgm725|bgm726|bgm727|bgm728|bgm729|bgm730|bgm731|bgm732|bgm733|bgm734|bgm735|bgm736|bgm737|bgm738|bgm739|bgm740|bgm741|bgm742|bgm743|bgm744|bgm745|bgm746|bgm747|bgm748|bgm749|bgm750|bgm751|bgm752|bgm753|bgm754|bgm755|bgm756|bgm757|bgm758|bgm759|bgm760|bgm761|bgm762|bgm763|bgm764|bgm765|bgm766|bgm767|bgm768|bgm769|bgm770|bgm771|bgm772|bgm773|bgm774|bgm775|bgm776|bgm777|bgm778|bgm779|bgm780|bgm781|bgm782|bgm783|bgm784|bgm785|bgm786|bgm787|bgm788|bgm789|bgm790|bgm791|bgm792|bgm793|bgm794|bgm795|bgm796|bgm797|bgm798|bgm799|bgm800|bgm801|bgm802|bgm803|bgm804|bgm805|bgm806|bgm807|bgm808|bgm809|bgm810|bgm811|bgm812|bgm813|bgm814|bgm815|bgm816|bgm817|bgm818|bgm819|bgm820|bgm821|bgm822|bgm823|bgm824|bgm825|bgm826|bgm827|bgm828|bgm829|bgm830|bgm831|bgm832|bgm833|bgm834|bgm835|bgm836|bgm837|bgm838|bgm839|bgm840|bgm841|bgm842|bgm843|bgm844|bgm845|bgm846|bgm847|bgm848|bgm849|bgm850|bgm851|bgm852|bgm853|bgm854|bgm855|bgm856|bgm857|bgm858|bgm859|bgm860|bgm861|bgm862|bgm863|bgm864|bgm865|bgm866|bgm867|bgm868|bgm869|bgm870|bgm871|bgm872|bgm873|bgm874|bgm875|bgm876|bgm877|bgm878|bgm879|bgm880|bgm881|bgm882|bgm883|bgm884|bgm885|bgm886|bgm887|bgm888|bgm889|bgm890|bgm891|bgm892|bgm893|bgm894|bgm895|bgm896|bgm897|bgm898|bgm899|bgm900|bgm901|bgm902|bgm903|bgm904|bgm905|bgm906|bgm907|bgm908|bgm909|bgm910|bgm911|bgm912|bgm913|bgm914|bgm915|bgm916|bgm917|bgm918|bgm919|bgm920|bgm921|bgm922|bgm923|bgm924|bgm925|bgm926|bgm927|bgm928|bgm929|bgm930|bgm931|bgm932|bgm933|bgm934|bgm935|bgm936|bgm937|bgm938|bgm939|bgm940|bgm941|bgm942|bgm943|bgm944|bgm945|bgm946|bgm947|bgm948|bgm949|bgm950|bgm951|bgm952|bgm953|bgm954|bgm955|bgm956|bgm957|bgm958|bgm959|bgm960|bgm961|bgm962|bgm963|bgm964|bgm965|bgm966|bgm967|bgm968|bgm969|bgm970|bgm971|bgm972|bgm973|bgm974|bgm975|bgm976|bgm977|bgm978|bgm979|bgm980|bgm981|bgm982|bgm983|bgm984|bgm985|bgm986|bgm987|bgm988|bgm989|bgm990|bgm991|bgm992|bgm993|bgm994|bgm995|bgm996|bgm997|bgm998|bgm999)\b[\p{Z}\s]*/u;

    const reg_directions = /^(action|up|down|left|right|\^|v|\<|\>|moving|stationary|parallel|perpendicular|horizontal|orthogonal|vertical|no|randomdir|random)$/;
    const reg_loopmarker = /^(startloop|endloop)$/;
    const reg_ruledirectionindicators = /^(up|down|left|right|horizontal|vertical|orthogonal|late|rigid)$/;
    const reg_sounddirectionindicators = /[\p{Z}\s]*(up|down|left|right|horizontal|vertical|orthogonal)(?![\p{L}\p{N}_])[\p{Z}\s]*/u;
    const reg_musicdirectionindicators = /[\p{Z}\s]*(up|down|left|right|horizontal|vertical|orthogonal)(?![\p{L}\p{N}_])[\p{Z}\s]*/u;
    const reg_winconditionquantifiers = /^(all|any|no|some)$/;
    const reg_keywords = /(checkpoint|objects|collisionlayers|legend|sounds|musics|rules|winconditions|\.\.\.|levels|up|down|left|right|^|\||\[|\]|v|\>|\<|no|horizontal|orthogonal|vertical|any|all|no|some|moving|stationary|parallel|perpendicular|action|move|action|create|destroy|cantmove|sfx000|sfx001|sfx002|sfx003|sfx004|sfx005|sfx006|sfx007|sfx008|sfx009|sfx010|sfx011|sfx012|sfx013|sfx014|sfx015|sfx016|sfx017|sfx018|sfx019|sfx020|sfx021|sfx022|sfx023|sfx024|sfx025|sfx026|sfx027|sfx028|sfx029|sfx030|sfx031|sfx032|sfx033|sfx034|sfx035|sfx036|sfx037|sfx038|sfx039|sfx040|sfx041|sfx042|sfx043|sfx044|sfx045|sfx046|sfx047|sfx048|sfx049|sfx050|sfx051|sfx052|sfx053|sfx054|sfx055|sfx056|sfx057|sfx058|sfx059|sfx060|sfx061|sfx062|sfx063|sfx064|sfx065|sfx066|sfx067|sfx068|sfx069|sfx070|sfx071|sfx072|sfx073|sfx074|sfx075|sfx076|sfx077|sfx078|sfx079|sfx080|sfx081|sfx082|sfx083|sfx084|sfx085|sfx086|sfx087|sfx088|sfx089|sfx090|sfx091|sfx092|sfx093|sfx094|sfx095|sfx096|sfx097|sfx098|sfx099|sfx100|sfx101|sfx102|sfx103|sfx104|sfx105|sfx106|sfx107|sfx108|sfx109|sfx110|sfx111|sfx112|sfx113|sfx114|sfx115|sfx116|sfx117|sfx118|sfx119|sfx120|sfx121|sfx122|sfx123|sfx124|sfx125|sfx126|sfx127|sfx128|sfx129|sfx130|sfx131|sfx132|sfx133|sfx134|sfx135|sfx136|sfx137|sfx138|sfx139|sfx140|sfx141|sfx142|sfx143|sfx144|sfx145|sfx146|sfx147|sfx148|sfx149|sfx150|sfx151|sfx152|sfx153|sfx154|sfx155|sfx156|sfx157|sfx158|sfx159|sfx160|sfx161|sfx162|sfx163|sfx164|sfx165|sfx166|sfx167|sfx168|sfx169|sfx170|sfx171|sfx172|sfx173|sfx174|sfx175|sfx176|sfx177|sfx178|sfx179|sfx180|sfx181|sfx182|sfx183|sfx184|sfx185|sfx186|sfx187|sfx188|sfx189|sfx190|sfx191|sfx192|sfx193|sfx194|sfx195|sfx196|sfx197|sfx198|sfx199|sfx200|sfx201|sfx202|sfx203|sfx204|sfx205|sfx206|sfx207|sfx208|sfx209|sfx210|sfx211|sfx212|sfx213|sfx214|sfx215|sfx216|sfx217|sfx218|sfx219|sfx220|sfx221|sfx222|sfx223|sfx224|sfx225|sfx226|sfx227|sfx228|sfx229|sfx230|sfx231|sfx232|sfx233|sfx234|sfx235|sfx236|sfx237|sfx238|sfx239|sfx240|sfx241|sfx242|sfx243|sfx244|sfx245|sfx246|sfx247|sfx248|sfx249|sfx250|sfx251|sfx252|sfx253|sfx254|sfx255|sfx256|sfx257|sfx258|sfx259|sfx260|sfx261|sfx262|sfx263|sfx264|sfx265|sfx266|sfx267|sfx268|sfx269|sfx270|sfx271|sfx272|sfx273|sfx274|sfx275|sfx276|sfx277|sfx278|sfx279|sfx280|sfx281|sfx282|sfx283|sfx284|sfx285|sfx286|sfx287|sfx288|sfx289|sfx290|sfx291|sfx292|sfx293|sfx294|sfx295|sfx296|sfx297|sfx298|sfx299|sfx300|sfx301|sfx302|sfx303|sfx304|sfx305|sfx306|sfx307|sfx308|sfx309|sfx310|sfx311|sfx312|sfx313|sfx314|sfx315|sfx316|sfx317|sfx318|sfx319|sfx320|sfx321|sfx322|sfx323|sfx324|sfx325|sfx326|sfx327|sfx328|sfx329|sfx330|sfx331|sfx332|sfx333|sfx334|sfx335|sfx336|sfx337|sfx338|sfx339|sfx340|sfx341|sfx342|sfx343|sfx344|sfx345|sfx346|sfx347|sfx348|sfx349|sfx350|sfx351|sfx352|sfx353|sfx354|sfx355|sfx356|sfx357|sfx358|sfx359|sfx360|sfx361|sfx362|sfx363|sfx364|sfx365|sfx366|sfx367|sfx368|sfx369|sfx370|sfx371|sfx372|sfx373|sfx374|sfx375|sfx376|sfx377|sfx378|sfx379|sfx380|sfx381|sfx382|sfx383|sfx384|sfx385|sfx386|sfx387|sfx388|sfx389|sfx390|sfx391|sfx392|sfx393|sfx394|sfx395|sfx396|sfx397|sfx398|sfx399|sfx400|sfx401|sfx402|sfx403|sfx404|sfx405|sfx406|sfx407|sfx408|sfx409|sfx410|sfx411|sfx412|sfx413|sfx414|sfx415|sfx416|sfx417|sfx418|sfx419|sfx420|sfx421|sfx422|sfx423|sfx424|sfx425|sfx426|sfx427|sfx428|sfx429|sfx430|sfx431|sfx432|sfx433|sfx434|sfx435|sfx436|sfx437|sfx438|sfx439|sfx440|sfx441|sfx442|sfx443|sfx444|sfx445|sfx446|sfx447|sfx448|sfx449|sfx450|sfx451|sfx452|sfx453|sfx454|sfx455|sfx456|sfx457|sfx458|sfx459|sfx460|sfx461|sfx462|sfx463|sfx464|sfx465|sfx466|sfx467|sfx468|sfx469|sfx470|sfx471|sfx472|sfx473|sfx474|sfx475|sfx476|sfx477|sfx478|sfx479|sfx480|sfx481|sfx482|sfx483|sfx484|sfx485|sfx486|sfx487|sfx488|sfx489|sfx490|sfx491|sfx492|sfx493|sfx494|sfx495|sfx496|sfx497|sfx498|sfx499|sfx500|sfx501|sfx502|sfx503|sfx504|sfx505|sfx506|sfx507|sfx508|sfx509|sfx510|sfx511|sfx512|sfx513|sfx514|sfx515|sfx516|sfx517|sfx518|sfx519|sfx520|sfx521|sfx522|sfx523|sfx524|sfx525|sfx526|sfx527|sfx528|sfx529|sfx530|sfx531|sfx532|sfx533|sfx534|sfx535|sfx536|sfx537|sfx538|sfx539|sfx540|sfx541|sfx542|sfx543|sfx544|sfx545|sfx546|sfx547|sfx548|sfx549|sfx550|sfx551|sfx552|sfx553|sfx554|sfx555|sfx556|sfx557|sfx558|sfx559|sfx560|sfx561|sfx562|sfx563|sfx564|sfx565|sfx566|sfx567|sfx568|sfx569|sfx570|sfx571|sfx572|sfx573|sfx574|sfx575|sfx576|sfx577|sfx578|sfx579|sfx580|sfx581|sfx582|sfx583|sfx584|sfx585|sfx586|sfx587|sfx588|sfx589|sfx590|sfx591|sfx592|sfx593|sfx594|sfx595|sfx596|sfx597|sfx598|sfx599|sfx600|sfx601|sfx602|sfx603|sfx604|sfx605|sfx606|sfx607|sfx608|sfx609|sfx610|sfx611|sfx612|sfx613|sfx614|sfx615|sfx616|sfx617|sfx618|sfx619|sfx620|sfx621|sfx622|sfx623|sfx624|sfx625|sfx626|sfx627|sfx628|sfx629|sfx630|sfx631|sfx632|sfx633|sfx634|sfx635|sfx636|sfx637|sfx638|sfx639|sfx640|sfx641|sfx642|sfx643|sfx644|sfx645|sfx646|sfx647|sfx648|sfx649|sfx650|sfx651|sfx652|sfx653|sfx654|sfx655|sfx656|sfx657|sfx658|sfx659|sfx660|sfx661|sfx662|sfx663|sfx664|sfx665|sfx666|sfx667|sfx668|sfx669|sfx670|sfx671|sfx672|sfx673|sfx674|sfx675|sfx676|sfx677|sfx678|sfx679|sfx680|sfx681|sfx682|sfx683|sfx684|sfx685|sfx686|sfx687|sfx688|sfx689|sfx690|sfx691|sfx692|sfx693|sfx694|sfx695|sfx696|sfx697|sfx698|sfx699|sfx700|sfx701|sfx702|sfx703|sfx704|sfx705|sfx706|sfx707|sfx708|sfx709|sfx710|sfx711|sfx712|sfx713|sfx714|sfx715|sfx716|sfx717|sfx718|sfx719|sfx720|sfx721|sfx722|sfx723|sfx724|sfx725|sfx726|sfx727|sfx728|sfx729|sfx730|sfx731|sfx732|sfx733|sfx734|sfx735|sfx736|sfx737|sfx738|sfx739|sfx740|sfx741|sfx742|sfx743|sfx744|sfx745|sfx746|sfx747|sfx748|sfx749|sfx750|sfx751|sfx752|sfx753|sfx754|sfx755|sfx756|sfx757|sfx758|sfx759|sfx760|sfx761|sfx762|sfx763|sfx764|sfx765|sfx766|sfx767|sfx768|sfx769|sfx770|sfx771|sfx772|sfx773|sfx774|sfx775|sfx776|sfx777|sfx778|sfx779|sfx780|sfx781|sfx782|sfx783|sfx784|sfx785|sfx786|sfx787|sfx788|sfx789|sfx790|sfx791|sfx792|sfx793|sfx794|sfx795|sfx796|sfx797|sfx798|sfx799|sfx800|sfx801|sfx802|sfx803|sfx804|sfx805|sfx806|sfx807|sfx808|sfx809|sfx810|sfx811|sfx812|sfx813|sfx814|sfx815|sfx816|sfx817|sfx818|sfx819|sfx820|sfx821|sfx822|sfx823|sfx824|sfx825|sfx826|sfx827|sfx828|sfx829|sfx830|sfx831|sfx832|sfx833|sfx834|sfx835|sfx836|sfx837|sfx838|sfx839|sfx840|sfx841|sfx842|sfx843|sfx844|sfx845|sfx846|sfx847|sfx848|sfx849|sfx850|sfx851|sfx852|sfx853|sfx854|sfx855|sfx856|sfx857|sfx858|sfx859|sfx860|sfx861|sfx862|sfx863|sfx864|sfx865|sfx866|sfx867|sfx868|sfx869|sfx870|sfx871|sfx872|sfx873|sfx874|sfx875|sfx876|sfx877|sfx878|sfx879|sfx880|sfx881|sfx882|sfx883|sfx884|sfx885|sfx886|sfx887|sfx888|sfx889|sfx890|sfx891|sfx892|sfx893|sfx894|sfx895|sfx896|sfx897|sfx898|sfx899|sfx900|sfx901|sfx902|sfx903|sfx904|sfx905|sfx906|sfx907|sfx908|sfx909|sfx910|sfx911|sfx912|sfx913|sfx914|sfx915|sfx916|sfx917|sfx918|sfx919|sfx920|sfx921|sfx922|sfx923|sfx924|sfx925|sfx926|sfx927|sfx928|sfx929|sfx930|sfx931|sfx932|sfx933|sfx934|sfx935|sfx936|sfx937|sfx938|sfx939|sfx940|sfx941|sfx942|sfx943|sfx944|sfx945|sfx946|sfx947|sfx948|sfx949|sfx950|sfx951|sfx952|sfx953|sfx954|sfx955|sfx956|sfx957|sfx958|sfx959|sfx960|sfx961|sfx962|sfx963|sfx964|sfx965|sfx966|sfx967|sfx968|sfx969|sfx970|sfx971|sfx972|sfx973|sfx974|sfx975|sfx976|sfx977|sfx978|sfx979|sfx980|sfx981|sfx982|sfx983|sfx984|sfx985|sfx986|sfx987|sfx988|sfx989|sfx990|sfx991|sfx992|sfx993|sfx994|sfx995|sfx996|sfx997|sfx998|sfx999|bgm000|bgm001|bgm002|bgm003|bgm004|bgm005|bgm006|bgm007|bgm008|bgm009|bgm010|bgm011|bgm012|bgm013|bgm014|bgm015|bgm016|bgm017|bgm018|bgm019|bgm020|bgm021|bgm022|bgm023|bgm024|bgm025|bgm026|bgm027|bgm028|bgm029|bgm030|bgm031|bgm032|bgm033|bgm034|bgm035|bgm036|bgm037|bgm038|bgm039|bgm040|bgm041|bgm042|bgm043|bgm044|bgm045|bgm046|bgm047|bgm048|bgm049|bgm050|bgm051|bgm052|bgm053|bgm054|bgm055|bgm056|bgm057|bgm058|bgm059|bgm060|bgm061|bgm062|bgm063|bgm064|bgm065|bgm066|bgm067|bgm068|bgm069|bgm070|bgm071|bgm072|bgm073|bgm074|bgm075|bgm076|bgm077|bgm078|bgm079|bgm080|bgm081|bgm082|bgm083|bgm084|bgm085|bgm086|bgm087|bgm088|bgm089|bgm090|bgm091|bgm092|bgm093|bgm094|bgm095|bgm096|bgm097|bgm098|bgm099|bgm100|bgm101|bgm102|bgm103|bgm104|bgm105|bgm106|bgm107|bgm108|bgm109|bgm110|bgm111|bgm112|bgm113|bgm114|bgm115|bgm116|bgm117|bgm118|bgm119|bgm120|bgm121|bgm122|bgm123|bgm124|bgm125|bgm126|bgm127|bgm128|bgm129|bgm130|bgm131|bgm132|bgm133|bgm134|bgm135|bgm136|bgm137|bgm138|bgm139|bgm140|bgm141|bgm142|bgm143|bgm144|bgm145|bgm146|bgm147|bgm148|bgm149|bgm150|bgm151|bgm152|bgm153|bgm154|bgm155|bgm156|bgm157|bgm158|bgm159|bgm160|bgm161|bgm162|bgm163|bgm164|bgm165|bgm166|bgm167|bgm168|bgm169|bgm170|bgm171|bgm172|bgm173|bgm174|bgm175|bgm176|bgm177|bgm178|bgm179|bgm180|bgm181|bgm182|bgm183|bgm184|bgm185|bgm186|bgm187|bgm188|bgm189|bgm190|bgm191|bgm192|bgm193|bgm194|bgm195|bgm196|bgm197|bgm198|bgm199|bgm200|bgm201|bgm202|bgm203|bgm204|bgm205|bgm206|bgm207|bgm208|bgm209|bgm210|bgm211|bgm212|bgm213|bgm214|bgm215|bgm216|bgm217|bgm218|bgm219|bgm220|bgm221|bgm222|bgm223|bgm224|bgm225|bgm226|bgm227|bgm228|bgm229|bgm230|bgm231|bgm232|bgm233|bgm234|bgm235|bgm236|bgm237|bgm238|bgm239|bgm240|bgm241|bgm242|bgm243|bgm244|bgm245|bgm246|bgm247|bgm248|bgm249|bgm250|bgm251|bgm252|bgm253|bgm254|bgm255|bgm256|bgm257|bgm258|bgm259|bgm260|bgm261|bgm262|bgm263|bgm264|bgm265|bgm266|bgm267|bgm268|bgm269|bgm270|bgm271|bgm272|bgm273|bgm274|bgm275|bgm276|bgm277|bgm278|bgm279|bgm280|bgm281|bgm282|bgm283|bgm284|bgm285|bgm286|bgm287|bgm288|bgm289|bgm290|bgm291|bgm292|bgm293|bgm294|bgm295|bgm296|bgm297|bgm298|bgm299|bgm300|bgm301|bgm302|bgm303|bgm304|bgm305|bgm306|bgm307|bgm308|bgm309|bgm310|bgm311|bgm312|bgm313|bgm314|bgm315|bgm316|bgm317|bgm318|bgm319|bgm320|bgm321|bgm322|bgm323|bgm324|bgm325|bgm326|bgm327|bgm328|bgm329|bgm330|bgm331|bgm332|bgm333|bgm334|bgm335|bgm336|bgm337|bgm338|bgm339|bgm340|bgm341|bgm342|bgm343|bgm344|bgm345|bgm346|bgm347|bgm348|bgm349|bgm350|bgm351|bgm352|bgm353|bgm354|bgm355|bgm356|bgm357|bgm358|bgm359|bgm360|bgm361|bgm362|bgm363|bgm364|bgm365|bgm366|bgm367|bgm368|bgm369|bgm370|bgm371|bgm372|bgm373|bgm374|bgm375|bgm376|bgm377|bgm378|bgm379|bgm380|bgm381|bgm382|bgm383|bgm384|bgm385|bgm386|bgm387|bgm388|bgm389|bgm390|bgm391|bgm392|bgm393|bgm394|bgm395|bgm396|bgm397|bgm398|bgm399|bgm400|bgm401|bgm402|bgm403|bgm404|bgm405|bgm406|bgm407|bgm408|bgm409|bgm410|bgm411|bgm412|bgm413|bgm414|bgm415|bgm416|bgm417|bgm418|bgm419|bgm420|bgm421|bgm422|bgm423|bgm424|bgm425|bgm426|bgm427|bgm428|bgm429|bgm430|bgm431|bgm432|bgm433|bgm434|bgm435|bgm436|bgm437|bgm438|bgm439|bgm440|bgm441|bgm442|bgm443|bgm444|bgm445|bgm446|bgm447|bgm448|bgm449|bgm450|bgm451|bgm452|bgm453|bgm454|bgm455|bgm456|bgm457|bgm458|bgm459|bgm460|bgm461|bgm462|bgm463|bgm464|bgm465|bgm466|bgm467|bgm468|bgm469|bgm470|bgm471|bgm472|bgm473|bgm474|bgm475|bgm476|bgm477|bgm478|bgm479|bgm480|bgm481|bgm482|bgm483|bgm484|bgm485|bgm486|bgm487|bgm488|bgm489|bgm490|bgm491|bgm492|bgm493|bgm494|bgm495|bgm496|bgm497|bgm498|bgm499|bgm500|bgm501|bgm502|bgm503|bgm504|bgm505|bgm506|bgm507|bgm508|bgm509|bgm510|bgm511|bgm512|bgm513|bgm514|bgm515|bgm516|bgm517|bgm518|bgm519|bgm520|bgm521|bgm522|bgm523|bgm524|bgm525|bgm526|bgm527|bgm528|bgm529|bgm530|bgm531|bgm532|bgm533|bgm534|bgm535|bgm536|bgm537|bgm538|bgm539|bgm540|bgm541|bgm542|bgm543|bgm544|bgm545|bgm546|bgm547|bgm548|bgm549|bgm550|bgm551|bgm552|bgm553|bgm554|bgm555|bgm556|bgm557|bgm558|bgm559|bgm560|bgm561|bgm562|bgm563|bgm564|bgm565|bgm566|bgm567|bgm568|bgm569|bgm570|bgm571|bgm572|bgm573|bgm574|bgm575|bgm576|bgm577|bgm578|bgm579|bgm580|bgm581|bgm582|bgm583|bgm584|bgm585|bgm586|bgm587|bgm588|bgm589|bgm590|bgm591|bgm592|bgm593|bgm594|bgm595|bgm596|bgm597|bgm598|bgm599|bgm600|bgm601|bgm602|bgm603|bgm604|bgm605|bgm606|bgm607|bgm608|bgm609|bgm610|bgm611|bgm612|bgm613|bgm614|bgm615|bgm616|bgm617|bgm618|bgm619|bgm620|bgm621|bgm622|bgm623|bgm624|bgm625|bgm626|bgm627|bgm628|bgm629|bgm630|bgm631|bgm632|bgm633|bgm634|bgm635|bgm636|bgm637|bgm638|bgm639|bgm640|bgm641|bgm642|bgm643|bgm644|bgm645|bgm646|bgm647|bgm648|bgm649|bgm650|bgm651|bgm652|bgm653|bgm654|bgm655|bgm656|bgm657|bgm658|bgm659|bgm660|bgm661|bgm662|bgm663|bgm664|bgm665|bgm666|bgm667|bgm668|bgm669|bgm670|bgm671|bgm672|bgm673|bgm674|bgm675|bgm676|bgm677|bgm678|bgm679|bgm680|bgm681|bgm682|bgm683|bgm684|bgm685|bgm686|bgm687|bgm688|bgm689|bgm690|bgm691|bgm692|bgm693|bgm694|bgm695|bgm696|bgm697|bgm698|bgm699|bgm700|bgm701|bgm702|bgm703|bgm704|bgm705|bgm706|bgm707|bgm708|bgm709|bgm710|bgm711|bgm712|bgm713|bgm714|bgm715|bgm716|bgm717|bgm718|bgm719|bgm720|bgm721|bgm722|bgm723|bgm724|bgm725|bgm726|bgm727|bgm728|bgm729|bgm730|bgm731|bgm732|bgm733|bgm734|bgm735|bgm736|bgm737|bgm738|bgm739|bgm740|bgm741|bgm742|bgm743|bgm744|bgm745|bgm746|bgm747|bgm748|bgm749|bgm750|bgm751|bgm752|bgm753|bgm754|bgm755|bgm756|bgm757|bgm758|bgm759|bgm760|bgm761|bgm762|bgm763|bgm764|bgm765|bgm766|bgm767|bgm768|bgm769|bgm770|bgm771|bgm772|bgm773|bgm774|bgm775|bgm776|bgm777|bgm778|bgm779|bgm780|bgm781|bgm782|bgm783|bgm784|bgm785|bgm786|bgm787|bgm788|bgm789|bgm790|bgm791|bgm792|bgm793|bgm794|bgm795|bgm796|bgm797|bgm798|bgm799|bgm800|bgm801|bgm802|bgm803|bgm804|bgm805|bgm806|bgm807|bgm808|bgm809|bgm810|bgm811|bgm812|bgm813|bgm814|bgm815|bgm816|bgm817|bgm818|bgm819|bgm820|bgm821|bgm822|bgm823|bgm824|bgm825|bgm826|bgm827|bgm828|bgm829|bgm830|bgm831|bgm832|bgm833|bgm834|bgm835|bgm836|bgm837|bgm838|bgm839|bgm840|bgm841|bgm842|bgm843|bgm844|bgm845|bgm846|bgm847|bgm848|bgm849|bgm850|bgm851|bgm852|bgm853|bgm854|bgm855|bgm856|bgm857|bgm858|bgm859|bgm860|bgm861|bgm862|bgm863|bgm864|bgm865|bgm866|bgm867|bgm868|bgm869|bgm870|bgm871|bgm872|bgm873|bgm874|bgm875|bgm876|bgm877|bgm878|bgm879|bgm880|bgm881|bgm882|bgm883|bgm884|bgm885|bgm886|bgm887|bgm888|bgm889|bgm890|bgm891|bgm892|bgm893|bgm894|bgm895|bgm896|bgm897|bgm898|bgm899|bgm900|bgm901|bgm902|bgm903|bgm904|bgm905|bgm906|bgm907|bgm908|bgm909|bgm910|bgm911|bgm912|bgm913|bgm914|bgm915|bgm916|bgm917|bgm918|bgm919|bgm920|bgm921|bgm922|bgm923|bgm924|bgm925|bgm926|bgm927|bgm928|bgm929|bgm930|bgm931|bgm932|bgm933|bgm934|bgm935|bgm936|bgm937|bgm938|bgm939|bgm940|bgm941|bgm942|bgm943|bgm944|bgm945|bgm946|bgm947|bgm948|bgm949|bgm950|bgm951|bgm952|bgm953|bgm954|bgm955|bgm956|bgm957|bgm958|bgm959|bgm960|bgm961|bgm962|bgm963|bgm964|bgm965|bgm966|bgm967|bgm968|bgm969|bgm970|bgm971|bgm972|bgm973|bgm974|bgm975|bgm976|bgm977|bgm978|bgm979|bgm980|bgm981|bgm982|bgm983|bgm984|bgm985|bgm986|bgm987|bgm988|bgm989|bgm990|bgm991|bgm992|bgm993|bgm994|bgm995|bgm996|bgm997|bgm998|bgm999|cancel|checkpoint|restart|win|message|again|undo|restart|titlescreen|startgame|cancel|endgame|startlevel|endlevel|showmessage|closemessage)/;
    const keyword_array = ['checkpoint','objects', 'collisionlayers', 'legend', 'sounds','musics', 'rules', '...','winconditions', 'levels','|','[',']','up', 'down', 'left', 'right', 'late','rigid', '^','v','\>','\<','no','randomdir','random', 'horizontal', 'vertical','any', 'all', 'no', 'some', 'moving','stationary','parallel','perpendicular','action','message', "move", "action", "create", "destroy", "cantmove", "sfx000", "sfx001", "sfx002", "sfx003", "sfx004", "sfx005", "sfx006", "sfx007", "sfx008", "sfx009", "sfx010", "sfx011", "sfx012", "sfx013", "sfx014", "sfx015", "sfx016", "sfx017", "sfx018", "sfx019", "sfx020", "sfx021", "sfx022", "sfx023", "sfx024", "sfx025", "sfx026", "sfx027", "sfx028", "sfx029", "sfx030", "sfx031", "sfx032", "sfx033", "sfx034", "sfx035", "sfx036", "sfx037", "sfx038", "sfx039", "sfx040", "sfx041", "sfx042", "sfx043", "sfx044", "sfx045", "sfx046", "sfx047", "sfx048", "sfx049", "sfx050", "sfx051", "sfx052", "sfx053", "sfx054", "sfx055", "sfx056", "sfx057", "sfx058", "sfx059", "sfx060", "sfx061", "sfx062", "sfx063", "sfx064", "sfx065", "sfx066", "sfx067", "sfx068", "sfx069", "sfx070", "sfx071", "sfx072", "sfx073", "sfx074", "sfx075", "sfx076", "sfx077", "sfx078", "sfx079", "sfx080", "sfx081", "sfx082", "sfx083", "sfx084", "sfx085", "sfx086", "sfx087", "sfx088", "sfx089", "sfx090", "sfx091", "sfx092", "sfx093", "sfx094", "sfx095", "sfx096", "sfx097", "sfx098", "sfx099", "sfx100", "sfx101", "sfx102", "sfx103", "sfx104", "sfx105", "sfx106", "sfx107", "sfx108", "sfx109", "sfx110", "sfx111", "sfx112", "sfx113", "sfx114", "sfx115", "sfx116", "sfx117", "sfx118", "sfx119", "sfx120", "sfx121", "sfx122", "sfx123", "sfx124", "sfx125", "sfx126", "sfx127", "sfx128", "sfx129", "sfx130", "sfx131", "sfx132", "sfx133", "sfx134", "sfx135", "sfx136", "sfx137", "sfx138", "sfx139", "sfx140", "sfx141", "sfx142", "sfx143", "sfx144", "sfx145", "sfx146", "sfx147", "sfx148", "sfx149", "sfx150", "sfx151", "sfx152", "sfx153", "sfx154", "sfx155", "sfx156", "sfx157", "sfx158", "sfx159", "sfx160", "sfx161", "sfx162", "sfx163", "sfx164", "sfx165", "sfx166", "sfx167", "sfx168", "sfx169", "sfx170", "sfx171", "sfx172", "sfx173", "sfx174", "sfx175", "sfx176", "sfx177", "sfx178", "sfx179", "sfx180", "sfx181", "sfx182", "sfx183", "sfx184", "sfx185", "sfx186", "sfx187", "sfx188", "sfx189", "sfx190", "sfx191", "sfx192", "sfx193", "sfx194", "sfx195", "sfx196", "sfx197", "sfx198", "sfx199", "sfx200", "sfx201", "sfx202", "sfx203", "sfx204", "sfx205", "sfx206", "sfx207", "sfx208", "sfx209", "sfx210", "sfx211", "sfx212", "sfx213", "sfx214", "sfx215", "sfx216", "sfx217", "sfx218", "sfx219", "sfx220", "sfx221", "sfx222", "sfx223", "sfx224", "sfx225", "sfx226", "sfx227", "sfx228", "sfx229", "sfx230", "sfx231", "sfx232", "sfx233", "sfx234", "sfx235", "sfx236", "sfx237", "sfx238", "sfx239", "sfx240", "sfx241", "sfx242", "sfx243", "sfx244", "sfx245", "sfx246", "sfx247", "sfx248", "sfx249", "sfx250", "sfx251", "sfx252", "sfx253", "sfx254", "sfx255", "sfx256", "sfx257", "sfx258", "sfx259", "sfx260", "sfx261", "sfx262", "sfx263", "sfx264", "sfx265", "sfx266", "sfx267", "sfx268", "sfx269", "sfx270", "sfx271", "sfx272", "sfx273", "sfx274", "sfx275", "sfx276", "sfx277", "sfx278", "sfx279", "sfx280", "sfx281", "sfx282", "sfx283", "sfx284", "sfx285", "sfx286", "sfx287", "sfx288", "sfx289", "sfx290", "sfx291", "sfx292", "sfx293", "sfx294", "sfx295", "sfx296", "sfx297", "sfx298", "sfx299", "sfx300", "sfx301", "sfx302", "sfx303", "sfx304", "sfx305", "sfx306", "sfx307", "sfx308", "sfx309", "sfx310", "sfx311", "sfx312", "sfx313", "sfx314", "sfx315", "sfx316", "sfx317", "sfx318", "sfx319", "sfx320", "sfx321", "sfx322", "sfx323", "sfx324", "sfx325", "sfx326", "sfx327", "sfx328", "sfx329", "sfx330", "sfx331", "sfx332", "sfx333", "sfx334", "sfx335", "sfx336", "sfx337", "sfx338", "sfx339", "sfx340", "sfx341", "sfx342", "sfx343", "sfx344", "sfx345", "sfx346", "sfx347", "sfx348", "sfx349", "sfx350", "sfx351", "sfx352", "sfx353", "sfx354", "sfx355", "sfx356", "sfx357", "sfx358", "sfx359", "sfx360", "sfx361", "sfx362", "sfx363", "sfx364", "sfx365", "sfx366", "sfx367", "sfx368", "sfx369", "sfx370", "sfx371", "sfx372", "sfx373", "sfx374", "sfx375", "sfx376", "sfx377", "sfx378", "sfx379", "sfx380", "sfx381", "sfx382", "sfx383", "sfx384", "sfx385", "sfx386", "sfx387", "sfx388", "sfx389", "sfx390", "sfx391", "sfx392", "sfx393", "sfx394", "sfx395", "sfx396", "sfx397", "sfx398", "sfx399", "sfx400", "sfx401", "sfx402", "sfx403", "sfx404", "sfx405", "sfx406", "sfx407", "sfx408", "sfx409", "sfx410", "sfx411", "sfx412", "sfx413", "sfx414", "sfx415", "sfx416", "sfx417", "sfx418", "sfx419", "sfx420", "sfx421", "sfx422", "sfx423", "sfx424", "sfx425", "sfx426", "sfx427", "sfx428", "sfx429", "sfx430", "sfx431", "sfx432", "sfx433", "sfx434", "sfx435", "sfx436", "sfx437", "sfx438", "sfx439", "sfx440", "sfx441", "sfx442", "sfx443", "sfx444", "sfx445", "sfx446", "sfx447", "sfx448", "sfx449", "sfx450", "sfx451", "sfx452", "sfx453", "sfx454", "sfx455", "sfx456", "sfx457", "sfx458", "sfx459", "sfx460", "sfx461", "sfx462", "sfx463", "sfx464", "sfx465", "sfx466", "sfx467", "sfx468", "sfx469", "sfx470", "sfx471", "sfx472", "sfx473", "sfx474", "sfx475", "sfx476", "sfx477", "sfx478", "sfx479", "sfx480", "sfx481", "sfx482", "sfx483", "sfx484", "sfx485", "sfx486", "sfx487", "sfx488", "sfx489", "sfx490", "sfx491", "sfx492", "sfx493", "sfx494", "sfx495", "sfx496", "sfx497", "sfx498", "sfx499", "sfx500", "sfx501", "sfx502", "sfx503", "sfx504", "sfx505", "sfx506", "sfx507", "sfx508", "sfx509", "sfx510", "sfx511", "sfx512", "sfx513", "sfx514", "sfx515", "sfx516", "sfx517", "sfx518", "sfx519", "sfx520", "sfx521", "sfx522", "sfx523", "sfx524", "sfx525", "sfx526", "sfx527", "sfx528", "sfx529", "sfx530", "sfx531", "sfx532", "sfx533", "sfx534", "sfx535", "sfx536", "sfx537", "sfx538", "sfx539", "sfx540", "sfx541", "sfx542", "sfx543", "sfx544", "sfx545", "sfx546", "sfx547", "sfx548", "sfx549", "sfx550", "sfx551", "sfx552", "sfx553", "sfx554", "sfx555", "sfx556", "sfx557", "sfx558", "sfx559", "sfx560", "sfx561", "sfx562", "sfx563", "sfx564", "sfx565", "sfx566", "sfx567", "sfx568", "sfx569", "sfx570", "sfx571", "sfx572", "sfx573", "sfx574", "sfx575", "sfx576", "sfx577", "sfx578", "sfx579", "sfx580", "sfx581", "sfx582", "sfx583", "sfx584", "sfx585", "sfx586", "sfx587", "sfx588", "sfx589", "sfx590", "sfx591", "sfx592", "sfx593", "sfx594", "sfx595", "sfx596", "sfx597", "sfx598", "sfx599", "sfx600", "sfx601", "sfx602", "sfx603", "sfx604", "sfx605", "sfx606", "sfx607", "sfx608", "sfx609", "sfx610", "sfx611", "sfx612", "sfx613", "sfx614", "sfx615", "sfx616", "sfx617", "sfx618", "sfx619", "sfx620", "sfx621", "sfx622", "sfx623", "sfx624", "sfx625", "sfx626", "sfx627", "sfx628", "sfx629", "sfx630", "sfx631", "sfx632", "sfx633", "sfx634", "sfx635", "sfx636", "sfx637", "sfx638", "sfx639", "sfx640", "sfx641", "sfx642", "sfx643", "sfx644", "sfx645", "sfx646", "sfx647", "sfx648", "sfx649", "sfx650", "sfx651", "sfx652", "sfx653", "sfx654", "sfx655", "sfx656", "sfx657", "sfx658", "sfx659", "sfx660", "sfx661", "sfx662", "sfx663", "sfx664", "sfx665", "sfx666", "sfx667", "sfx668", "sfx669", "sfx670", "sfx671", "sfx672", "sfx673", "sfx674", "sfx675", "sfx676", "sfx677", "sfx678", "sfx679", "sfx680", "sfx681", "sfx682", "sfx683", "sfx684", "sfx685", "sfx686", "sfx687", "sfx688", "sfx689", "sfx690", "sfx691", "sfx692", "sfx693", "sfx694", "sfx695", "sfx696", "sfx697", "sfx698", "sfx699", "sfx700", "sfx701", "sfx702", "sfx703", "sfx704", "sfx705", "sfx706", "sfx707", "sfx708", "sfx709", "sfx710", "sfx711", "sfx712", "sfx713", "sfx714", "sfx715", "sfx716", "sfx717", "sfx718", "sfx719", "sfx720", "sfx721", "sfx722", "sfx723", "sfx724", "sfx725", "sfx726", "sfx727", "sfx728", "sfx729", "sfx730", "sfx731", "sfx732", "sfx733", "sfx734", "sfx735", "sfx736", "sfx737", "sfx738", "sfx739", "sfx740", "sfx741", "sfx742", "sfx743", "sfx744", "sfx745", "sfx746", "sfx747", "sfx748", "sfx749", "sfx750", "sfx751", "sfx752", "sfx753", "sfx754", "sfx755", "sfx756", "sfx757", "sfx758", "sfx759", "sfx760", "sfx761", "sfx762", "sfx763", "sfx764", "sfx765", "sfx766", "sfx767", "sfx768", "sfx769", "sfx770", "sfx771", "sfx772", "sfx773", "sfx774", "sfx775", "sfx776", "sfx777", "sfx778", "sfx779", "sfx780", "sfx781", "sfx782", "sfx783", "sfx784", "sfx785", "sfx786", "sfx787", "sfx788", "sfx789", "sfx790", "sfx791", "sfx792", "sfx793", "sfx794", "sfx795", "sfx796", "sfx797", "sfx798", "sfx799", "sfx800", "sfx801", "sfx802", "sfx803", "sfx804", "sfx805", "sfx806", "sfx807", "sfx808", "sfx809", "sfx810", "sfx811", "sfx812", "sfx813", "sfx814", "sfx815", "sfx816", "sfx817", "sfx818", "sfx819", "sfx820", "sfx821", "sfx822", "sfx823", "sfx824", "sfx825", "sfx826", "sfx827", "sfx828", "sfx829", "sfx830", "sfx831", "sfx832", "sfx833", "sfx834", "sfx835", "sfx836", "sfx837", "sfx838", "sfx839", "sfx840", "sfx841", "sfx842", "sfx843", "sfx844", "sfx845", "sfx846", "sfx847", "sfx848", "sfx849", "sfx850", "sfx851", "sfx852", "sfx853", "sfx854", "sfx855", "sfx856", "sfx857", "sfx858", "sfx859", "sfx860", "sfx861", "sfx862", "sfx863", "sfx864", "sfx865", "sfx866", "sfx867", "sfx868", "sfx869", "sfx870", "sfx871", "sfx872", "sfx873", "sfx874", "sfx875", "sfx876", "sfx877", "sfx878", "sfx879", "sfx880", "sfx881", "sfx882", "sfx883", "sfx884", "sfx885", "sfx886", "sfx887", "sfx888", "sfx889", "sfx890", "sfx891", "sfx892", "sfx893", "sfx894", "sfx895", "sfx896", "sfx897", "sfx898", "sfx899", "sfx900", "sfx901", "sfx902", "sfx903", "sfx904", "sfx905", "sfx906", "sfx907", "sfx908", "sfx909", "sfx910", "sfx911", "sfx912", "sfx913", "sfx914", "sfx915", "sfx916", "sfx917", "sfx918", "sfx919", "sfx920", "sfx921", "sfx922", "sfx923", "sfx924", "sfx925", "sfx926", "sfx927", "sfx928", "sfx929", "sfx930", "sfx931", "sfx932", "sfx933", "sfx934", "sfx935", "sfx936", "sfx937", "sfx938", "sfx939", "sfx940", "sfx941", "sfx942", "sfx943", "sfx944", "sfx945", "sfx946", "sfx947", "sfx948", "sfx949", "sfx950", "sfx951", "sfx952", "sfx953", "sfx954", "sfx955", "sfx956", "sfx957", "sfx958", "sfx959", "sfx960", "sfx961", "sfx962", "sfx963", "sfx964", "sfx965", "sfx966", "sfx967", "sfx968", "sfx969", "sfx970", "sfx971", "sfx972", "sfx973", "sfx974", "sfx975", "sfx976", "sfx977", "sfx978", "sfx979", "sfx980", "sfx981", "sfx982", "sfx983", "sfx984", "sfx985", "sfx986", "sfx987", "sfx988", "sfx989", "sfx990", "sfx991", "sfx992", "sfx993", "sfx994", "sfx995", "sfx996", "sfx997", "sfx998", "sfx999", "bgm000", "bgm001", "bgm002", "bgm003", "bgm004", "bgm005", "bgm006", "bgm007", "bgm008", "bgm009", "bgm010", "bgm011", "bgm012", "bgm013", "bgm014", "bgm015", "bgm016", "bgm017", "bgm018", "bgm019", "bgm020", "bgm021", "bgm022", "bgm023", "bgm024", "bgm025", "bgm026", "bgm027", "bgm028", "bgm029", "bgm030", "bgm031", "bgm032", "bgm033", "bgm034", "bgm035", "bgm036", "bgm037", "bgm038", "bgm039", "bgm040", "bgm041", "bgm042", "bgm043", "bgm044", "bgm045", "bgm046", "bgm047", "bgm048", "bgm049", "bgm050", "bgm051", "bgm052", "bgm053", "bgm054", "bgm055", "bgm056", "bgm057", "bgm058", "bgm059", "bgm060", "bgm061", "bgm062", "bgm063", "bgm064", "bgm065", "bgm066", "bgm067", "bgm068", "bgm069", "bgm070", "bgm071", "bgm072", "bgm073", "bgm074", "bgm075", "bgm076", "bgm077", "bgm078", "bgm079", "bgm080", "bgm081", "bgm082", "bgm083", "bgm084", "bgm085", "bgm086", "bgm087", "bgm088", "bgm089", "bgm090", "bgm091", "bgm092", "bgm093", "bgm094", "bgm095", "bgm096", "bgm097", "bgm098", "bgm099", "bgm100", "bgm101", "bgm102", "bgm103", "bgm104", "bgm105", "bgm106", "bgm107", "bgm108", "bgm109", "bgm110", "bgm111", "bgm112", "bgm113", "bgm114", "bgm115", "bgm116", "bgm117", "bgm118", "bgm119", "bgm120", "bgm121", "bgm122", "bgm123", "bgm124", "bgm125", "bgm126", "bgm127", "bgm128", "bgm129", "bgm130", "bgm131", "bgm132", "bgm133", "bgm134", "bgm135", "bgm136", "bgm137", "bgm138", "bgm139", "bgm140", "bgm141", "bgm142", "bgm143", "bgm144", "bgm145", "bgm146", "bgm147", "bgm148", "bgm149", "bgm150", "bgm151", "bgm152", "bgm153", "bgm154", "bgm155", "bgm156", "bgm157", "bgm158", "bgm159", "bgm160", "bgm161", "bgm162", "bgm163", "bgm164", "bgm165", "bgm166", "bgm167", "bgm168", "bgm169", "bgm170", "bgm171", "bgm172", "bgm173", "bgm174", "bgm175", "bgm176", "bgm177", "bgm178", "bgm179", "bgm180", "bgm181", "bgm182", "bgm183", "bgm184", "bgm185", "bgm186", "bgm187", "bgm188", "bgm189", "bgm190", "bgm191", "bgm192", "bgm193", "bgm194", "bgm195", "bgm196", "bgm197", "bgm198", "bgm199", "bgm200", "bgm201", "bgm202", "bgm203", "bgm204", "bgm205", "bgm206", "bgm207", "bgm208", "bgm209", "bgm210", "bgm211", "bgm212", "bgm213", "bgm214", "bgm215", "bgm216", "bgm217", "bgm218", "bgm219", "bgm220", "bgm221", "bgm222", "bgm223", "bgm224", "bgm225", "bgm226", "bgm227", "bgm228", "bgm229", "bgm230", "bgm231", "bgm232", "bgm233", "bgm234", "bgm235", "bgm236", "bgm237", "bgm238", "bgm239", "bgm240", "bgm241", "bgm242", "bgm243", "bgm244", "bgm245", "bgm246", "bgm247", "bgm248", "bgm249", "bgm250", "bgm251", "bgm252", "bgm253", "bgm254", "bgm255", "bgm256", "bgm257", "bgm258", "bgm259", "bgm260", "bgm261", "bgm262", "bgm263", "bgm264", "bgm265", "bgm266", "bgm267", "bgm268", "bgm269", "bgm270", "bgm271", "bgm272", "bgm273", "bgm274", "bgm275", "bgm276", "bgm277", "bgm278", "bgm279", "bgm280", "bgm281", "bgm282", "bgm283", "bgm284", "bgm285", "bgm286", "bgm287", "bgm288", "bgm289", "bgm290", "bgm291", "bgm292", "bgm293", "bgm294", "bgm295", "bgm296", "bgm297", "bgm298", "bgm299", "bgm300", "bgm301", "bgm302", "bgm303", "bgm304", "bgm305", "bgm306", "bgm307", "bgm308", "bgm309", "bgm310", "bgm311", "bgm312", "bgm313", "bgm314", "bgm315", "bgm316", "bgm317", "bgm318", "bgm319", "bgm320", "bgm321", "bgm322", "bgm323", "bgm324", "bgm325", "bgm326", "bgm327", "bgm328", "bgm329", "bgm330", "bgm331", "bgm332", "bgm333", "bgm334", "bgm335", "bgm336", "bgm337", "bgm338", "bgm339", "bgm340", "bgm341", "bgm342", "bgm343", "bgm344", "bgm345", "bgm346", "bgm347", "bgm348", "bgm349", "bgm350", "bgm351", "bgm352", "bgm353", "bgm354", "bgm355", "bgm356", "bgm357", "bgm358", "bgm359", "bgm360", "bgm361", "bgm362", "bgm363", "bgm364", "bgm365", "bgm366", "bgm367", "bgm368", "bgm369", "bgm370", "bgm371", "bgm372", "bgm373", "bgm374", "bgm375", "bgm376", "bgm377", "bgm378", "bgm379", "bgm380", "bgm381", "bgm382", "bgm383", "bgm384", "bgm385", "bgm386", "bgm387", "bgm388", "bgm389", "bgm390", "bgm391", "bgm392", "bgm393", "bgm394", "bgm395", "bgm396", "bgm397", "bgm398", "bgm399", "bgm400", "bgm401", "bgm402", "bgm403", "bgm404", "bgm405", "bgm406", "bgm407", "bgm408", "bgm409", "bgm410", "bgm411", "bgm412", "bgm413", "bgm414", "bgm415", "bgm416", "bgm417", "bgm418", "bgm419", "bgm420", "bgm421", "bgm422", "bgm423", "bgm424", "bgm425", "bgm426", "bgm427", "bgm428", "bgm429", "bgm430", "bgm431", "bgm432", "bgm433", "bgm434", "bgm435", "bgm436", "bgm437", "bgm438", "bgm439", "bgm440", "bgm441", "bgm442", "bgm443", "bgm444", "bgm445", "bgm446", "bgm447", "bgm448", "bgm449", "bgm450", "bgm451", "bgm452", "bgm453", "bgm454", "bgm455", "bgm456", "bgm457", "bgm458", "bgm459", "bgm460", "bgm461", "bgm462", "bgm463", "bgm464", "bgm465", "bgm466", "bgm467", "bgm468", "bgm469", "bgm470", "bgm471", "bgm472", "bgm473", "bgm474", "bgm475", "bgm476", "bgm477", "bgm478", "bgm479", "bgm480", "bgm481", "bgm482", "bgm483", "bgm484", "bgm485", "bgm486", "bgm487", "bgm488", "bgm489", "bgm490", "bgm491", "bgm492", "bgm493", "bgm494", "bgm495", "bgm496", "bgm497", "bgm498", "bgm499", "bgm500", "bgm501", "bgm502", "bgm503", "bgm504", "bgm505", "bgm506", "bgm507", "bgm508", "bgm509", "bgm510", "bgm511", "bgm512", "bgm513", "bgm514", "bgm515", "bgm516", "bgm517", "bgm518", "bgm519", "bgm520", "bgm521", "bgm522", "bgm523", "bgm524", "bgm525", "bgm526", "bgm527", "bgm528", "bgm529", "bgm530", "bgm531", "bgm532", "bgm533", "bgm534", "bgm535", "bgm536", "bgm537", "bgm538", "bgm539", "bgm540", "bgm541", "bgm542", "bgm543", "bgm544", "bgm545", "bgm546", "bgm547", "bgm548", "bgm549", "bgm550", "bgm551", "bgm552", "bgm553", "bgm554", "bgm555", "bgm556", "bgm557", "bgm558", "bgm559", "bgm560", "bgm561", "bgm562", "bgm563", "bgm564", "bgm565", "bgm566", "bgm567", "bgm568", "bgm569", "bgm570", "bgm571", "bgm572", "bgm573", "bgm574", "bgm575", "bgm576", "bgm577", "bgm578", "bgm579", "bgm580", "bgm581", "bgm582", "bgm583", "bgm584", "bgm585", "bgm586", "bgm587", "bgm588", "bgm589", "bgm590", "bgm591", "bgm592", "bgm593", "bgm594", "bgm595", "bgm596", "bgm597", "bgm598", "bgm599", "bgm600", "bgm601", "bgm602", "bgm603", "bgm604", "bgm605", "bgm606", "bgm607", "bgm608", "bgm609", "bgm610", "bgm611", "bgm612", "bgm613", "bgm614", "bgm615", "bgm616", "bgm617", "bgm618", "bgm619", "bgm620", "bgm621", "bgm622", "bgm623", "bgm624", "bgm625", "bgm626", "bgm627", "bgm628", "bgm629", "bgm630", "bgm631", "bgm632", "bgm633", "bgm634", "bgm635", "bgm636", "bgm637", "bgm638", "bgm639", "bgm640", "bgm641", "bgm642", "bgm643", "bgm644", "bgm645", "bgm646", "bgm647", "bgm648", "bgm649", "bgm650", "bgm651", "bgm652", "bgm653", "bgm654", "bgm655", "bgm656", "bgm657", "bgm658", "bgm659", "bgm660", "bgm661", "bgm662", "bgm663", "bgm664", "bgm665", "bgm666", "bgm667", "bgm668", "bgm669", "bgm670", "bgm671", "bgm672", "bgm673", "bgm674", "bgm675", "bgm676", "bgm677", "bgm678", "bgm679", "bgm680", "bgm681", "bgm682", "bgm683", "bgm684", "bgm685", "bgm686", "bgm687", "bgm688", "bgm689", "bgm690", "bgm691", "bgm692", "bgm693", "bgm694", "bgm695", "bgm696", "bgm697", "bgm698", "bgm699", "bgm700", "bgm701", "bgm702", "bgm703", "bgm704", "bgm705", "bgm706", "bgm707", "bgm708", "bgm709", "bgm710", "bgm711", "bgm712", "bgm713", "bgm714", "bgm715", "bgm716", "bgm717", "bgm718", "bgm719", "bgm720", "bgm721", "bgm722", "bgm723", "bgm724", "bgm725", "bgm726", "bgm727", "bgm728", "bgm729", "bgm730", "bgm731", "bgm732", "bgm733", "bgm734", "bgm735", "bgm736", "bgm737", "bgm738", "bgm739", "bgm740", "bgm741", "bgm742", "bgm743", "bgm744", "bgm745", "bgm746", "bgm747", "bgm748", "bgm749", "bgm750", "bgm751", "bgm752", "bgm753", "bgm754", "bgm755", "bgm756", "bgm757", "bgm758", "bgm759", "bgm760", "bgm761", "bgm762", "bgm763", "bgm764", "bgm765", "bgm766", "bgm767", "bgm768", "bgm769", "bgm770", "bgm771", "bgm772", "bgm773", "bgm774", "bgm775", "bgm776", "bgm777", "bgm778", "bgm779", "bgm780", "bgm781", "bgm782", "bgm783", "bgm784", "bgm785", "bgm786", "bgm787", "bgm788", "bgm789", "bgm790", "bgm791", "bgm792", "bgm793", "bgm794", "bgm795", "bgm796", "bgm797", "bgm798", "bgm799", "bgm800", "bgm801", "bgm802", "bgm803", "bgm804", "bgm805", "bgm806", "bgm807", "bgm808", "bgm809", "bgm810", "bgm811", "bgm812", "bgm813", "bgm814", "bgm815", "bgm816", "bgm817", "bgm818", "bgm819", "bgm820", "bgm821", "bgm822", "bgm823", "bgm824", "bgm825", "bgm826", "bgm827", "bgm828", "bgm829", "bgm830", "bgm831", "bgm832", "bgm833", "bgm834", "bgm835", "bgm836", "bgm837", "bgm838", "bgm839", "bgm840", "bgm841", "bgm842", "bgm843", "bgm844", "bgm845", "bgm846", "bgm847", "bgm848", "bgm849", "bgm850", "bgm851", "bgm852", "bgm853", "bgm854", "bgm855", "bgm856", "bgm857", "bgm858", "bgm859", "bgm860", "bgm861", "bgm862", "bgm863", "bgm864", "bgm865", "bgm866", "bgm867", "bgm868", "bgm869", "bgm870", "bgm871", "bgm872", "bgm873", "bgm874", "bgm875", "bgm876", "bgm877", "bgm878", "bgm879", "bgm880", "bgm881", "bgm882", "bgm883", "bgm884", "bgm885", "bgm886", "bgm887", "bgm888", "bgm889", "bgm890", "bgm891", "bgm892", "bgm893", "bgm894", "bgm895", "bgm896", "bgm897", "bgm898", "bgm899", "bgm900", "bgm901", "bgm902", "bgm903", "bgm904", "bgm905", "bgm906", "bgm907", "bgm908", "bgm909", "bgm910", "bgm911", "bgm912", "bgm913", "bgm914", "bgm915", "bgm916", "bgm917", "bgm918", "bgm919", "bgm920", "bgm921", "bgm922", "bgm923", "bgm924", "bgm925", "bgm926", "bgm927", "bgm928", "bgm929", "bgm930", "bgm931", "bgm932", "bgm933", "bgm934", "bgm935", "bgm936", "bgm937", "bgm938", "bgm939", "bgm940", "bgm941", "bgm942", "bgm943", "bgm944", "bgm945", "bgm946", "bgm947", "bgm948", "bgm949", "bgm950", "bgm951", "bgm952", "bgm953", "bgm954", "bgm955", "bgm956", "bgm957", "bgm958", "bgm959", "bgm960", "bgm961", "bgm962", "bgm963", "bgm964", "bgm965", "bgm966", "bgm967", "bgm968", "bgm969", "bgm970", "bgm971", "bgm972", "bgm973", "bgm974", "bgm975", "bgm976", "bgm977", "bgm978", "bgm979", "bgm980", "bgm981", "bgm982", "bgm983", "bgm984", "bgm985", "bgm986", "bgm987", "bgm988", "bgm989", "bgm990", "bgm991", "bgm992", "bgm993", "bgm994", "bgm995", "bgm996", "bgm997", "bgm998", "bgm999", "cancel", "checkpoint", "restart", "win", "message", "again", "undo", "restart", "titlescreen", "startgame", "cancel", "endgame", "startlevel", "endlevel", "showmessage", "closemessage"];

    function errorFallbackMatchToken(stream){
        var match=stream.match(reg_match_until_commentstart_or_whitespace, true);
        if (match===null){
            //just in case, I don't know for sure if it can happen but, just in case I don't 
            //understand unicode and the above doesn't match anything, force some match progress.
            match=stream.match(reg_notcommentstart, true);                                    
        }
        return match;
    }
    
    function processLegendLine(state, mixedCase){
        var ok=true;
        var splits = state.current_line_wip_array;
        if (splits.length===0){
            return;
        }

        if (splits.length === 1) {
            logError('Incorrect format of legend - should be one of "A = B", "A = B or C [ or D ...]", "A = B and C [ and D ...]".', state.lineNumber);
            ok=false;
        } else if (splits.length%2===0){
            logError(`Incorrect format of legend - should be one of "A = B", "A = B or C [ or D ...]", "A = B and C [ and D ...]", but it looks like you have a dangling "${state.current_line_wip_array[state.current_line_wip_array.length-1].toUpperCase()}"?`, state.lineNumber);
            ok=false;
        } else {
            var candname = splits[0];
            
            var alreadyDefined = wordAlreadyDeclared(state,candname);
            if (alreadyDefined!==null){
                logError(`Name "${candname.toUpperCase()}" already in use (on line <a onclick="jumpToLine(${alreadyDefined.lineNumber});" href="javascript:void(0);"><span class="errorTextLineNumber">line ${alreadyDefined.lineNumber}</span></a>).`, state.lineNumber);
                ok=false;
            }

            if (keyword_array.indexOf(candname)>=0) {
                logWarning('You named an object "' + candname.toUpperCase() + '", but this is a keyword. Don\'t do that!', state.lineNumber);
            }
        
        
            for (var i=2; i<splits.length; i+=2){
                var nname = splits[i];
                if (nname===candname){
                    logError("You can't define object " + candname.toUpperCase() + " in terms of itself!", state.lineNumber);
                    ok=false;
                    var idx = splits.indexOf(candname, 2);
                    while (idx >=2){
                        if (idx>=4){
                            splits.splice(idx-1, 2);
                        } else {
                            splits.splice(idx, 2);
                        }
                        idx = splits.indexOf(candname, 2);
                    }          
                }   
                for (var j=2;j<i;j+=2){
                    var oname = splits[j];
                    if(oname===nname){
                        logWarning("You're repeating the object " + oname.toUpperCase() + " here multiple times on the RHS.  This makes no sense.  Don't do that.", state.lineNumber);                        
                    }
                }                       
            } 

            //for every other word, check if it's a valid name
            for (var i=2;i<splits.length;i+=2){
                var defname = splits[i];
                if (defname!==candname){//we already have an error message for that just above.
                    checkNameDefined(state,defname);
                }
            }
        
            if (splits.length === 3) {
                //SYNONYM
                var synonym = [splits[0], splits[2]];
                synonym.lineNumber = state.lineNumber;
                registerOriginalCaseName(state,splits[0],mixedCase,state.lineNumber);
                state.legend_synonyms.push(synonym);
            } else if (splits[3]==='and'){
                //AGGREGATE
                var substitutor = function(n) {
                    n = n.toLowerCase();
                    if (n in state.objects) {
                        return [n];
                    } 
                    for (var i=0;i<state.legend_synonyms.length;i++) {
                        var a = state.legend_synonyms[i];
                        if (a[0]===n) {   
                            return substitutor(a[1]);
                        }
                    }
                    for (var i=0;i<state.legend_aggregates.length;i++) {
                        var a = state.legend_aggregates[i];
                        if (a[0]===n) {                                			
                            return [].concat.apply([],a.slice(1).map(substitutor));
                        }
                    }
                    for (var i=0;i<state.legend_properties.length;i++) {
                        var a = state.legend_properties[i];
                        if (a[0]===n) {         
                            logError("Cannot define an aggregate (using 'and') in terms of properties (something that uses 'or').", state.lineNumber);
                            ok=false;
                            return [n];
                        }
                    }
                    return [n];
                };
                                                
                var newlegend = [splits[0]].concat(substitutor(splits[2])).concat(substitutor(splits[4]));
                for (var i = 6; i < splits.length; i += 2) {
                    newlegend = newlegend.concat(substitutor(splits[i]));
                }
                newlegend.lineNumber = state.lineNumber;

                registerOriginalCaseName(state,newlegend[0],mixedCase,state.lineNumber);
                state.legend_aggregates.push(newlegend);
        
            } else if (splits[3]==='or'){
                var malformed=true;

                var substitutor = function(n) {

                    n = n.toLowerCase();
                    if (n in state.objects) {
                        return [n];
                    } 

                    for (var i=0;i<state.legend_synonyms.length;i++) {
                        var a = state.legend_synonyms[i];
                        if (a[0]===n) {   
                            return substitutor(a[1]);
                        }
                    }
                    for (var i=0;i<state.legend_aggregates.length;i++) {
                        var a = state.legend_aggregates[i];
                        if (a[0]===n) {           
                            logError("Cannot define a property (something defined in terms of 'or') in terms of aggregates (something that uses 'and').", state.lineNumber);
                            malformed=false;          
                        }
                    }
                    for (var i=0;i<state.legend_properties.length;i++) {
                        var a = state.legend_properties[i];
                        if (a[0]===n) {  
                            var result = [];
                            for (var j=1;j<a.length;j++){
                                if (a[j]===n){
                                    //error here superfluous, also detected elsewhere (cf 'You can't define object' / #789)
                                    //logError('Error, recursive definition found for '+n+'.', state.lineNumber);                                
                                } else {
                                    result = result.concat(substitutor(a[j]));
                                }
                            }
                            return result;
                        }
                    }
                    return [n];
                };

                for (var i = 5; i < splits.length; i += 2) {
                    if (splits[i].toLowerCase() !== 'or') {
                        malformed = false;
                        break;
                    }
                }
                if (malformed) {
                    var newlegend = [splits[0]].concat(substitutor(splits[2])).concat(substitutor(splits[4]));
                    for (var i = 6; i < splits.length; i += 2) {
                        newlegend.push(splits[i].toLowerCase());
                    }
                    newlegend.lineNumber = state.lineNumber;

                    registerOriginalCaseName(state,newlegend[0],mixedCase,state.lineNumber);
                    state.legend_properties.push(newlegend);
                }
            } else {
                if (ok){
                    //no it's not ok but we don't know why
                    logError('This legend-entry is incorrectly-formatted - it should be one of A = B, A = B or C ( or D ...), A = B and C (and D ...)', state.lineNumber);
                    ok=false;
                } 
            }                    
        }
    }

    function processSoundsLine(state){
        if (state.current_line_wip_array.length===0){
            return;
        }
        //if last entry in array is 'ERROR', do nothing
        if (state.current_line_wip_array[state.current_line_wip_array.length-1]==='ERROR'){

        } else {
            //take the first component from each pair in the array
            var soundrow = state.current_line_wip_array;//.map(function(a){return a[0];});
            soundrow.push(state.lineNumber);
            state.sounds.push(soundrow);
        }

    }
    function processMusicsLine(state){
        if (state.current_line_wip_array.length===0){
            return;
        }
        //if last entry in array is 'ERROR', do nothing
        if (state.current_line_wip_array[state.current_line_wip_array.length-1]==='ERROR'){

        } else {
            //take the first component from each pair in the array
            var musicrow = state.current_line_wip_array;//.map(function(a){return a[0];});
            musicrow.push(state.lineNumber);
            state.musics.push(musicrow);

        }

    }

    // because of all the early-outs in the token function, this is really just right now attached
    // too places where we can early out during the legend. To make it more versatile we'd have to change 
    // all the early-outs in the token function to flag-assignment for returning outside the case 
    // statement.
    function endOfLineProcessing(state, mixedCase){
        if (state.section==='legend'){
            processLegendLine(state,mixedCase);
        } else if (state.section ==='sounds'){
            processSoundsLine(state);
        }
    }

    //  var keywordRegex = new RegExp("\\b(("+cons.join(")|(")+"))$", 'i');

    var fullSpriteMatrix = [
        '00000',
        '00000',
        '00000',
        '00000',
        '00000'
    ];

    return {
        copyState: function(state) {
            var objectsCopy = {};
            for (var i in state.objects) {
              if (state.objects.hasOwnProperty(i)) {
                var o = state.objects[i];
                objectsCopy[i] = {
                  colors: o.colors.concat([]),
                  lineNumber : o.lineNumber,
                  spritematrix: o.spritematrix.concat([])
                }
              }
            }

            var collisionLayersCopy = [];
            for (var i = 0; i < state.collisionLayers.length; i++) {
              collisionLayersCopy.push(state.collisionLayers[i].concat([]));
            }

            var legend_synonymsCopy = [];
            var legend_aggregatesCopy = [];
            var legend_propertiesCopy = [];
            var soundsCopy = [];
            var musicsCopy = [];
            var levelsCopy = [];
            var winConditionsCopy = [];
            var rulesCopy = [];

            for (var i = 0; i < state.legend_synonyms.length; i++) {
              legend_synonymsCopy.push(state.legend_synonyms[i].concat([]));
            }
            for (var i = 0; i < state.legend_aggregates.length; i++) {
              legend_aggregatesCopy.push(state.legend_aggregates[i].concat([]));
            }
            for (var i = 0; i < state.legend_properties.length; i++) {
              legend_propertiesCopy.push(state.legend_properties[i].concat([]));
            }
            for (var i = 0; i < state.sounds.length; i++) {
              soundsCopy.push(state.sounds[i].concat([]));
            }
            for (var i = 0; i < state.musics.length; i++) {
              musicsCopy.push(state.musics[i].concat([]));
              }
            for (var i = 0; i < state.levels.length; i++) {
              levelsCopy.push(state.levels[i].concat([]));
            }
            for (var i = 0; i < state.winconditions.length; i++) {
              winConditionsCopy.push(state.winconditions[i].concat([]));
            }
            for (var i = 0; i < state.rules.length; i++) {
              rulesCopy.push(state.rules[i].concat([]));
            }

            var original_case_namesCopy = Object.assign({},state.original_case_names);
            var original_line_numbersCopy = Object.assign({},state.original_line_numbers);
            
            var nstate = {
              lineNumber: state.lineNumber,

              objects: objectsCopy,
              collisionLayers: collisionLayersCopy,

              commentLevel: state.commentLevel,
              section: state.section,
              visitedSections: state.visitedSections.concat([]),

              line_should_end: state.line_should_end,
              line_should_end_because: state.line_should_end_because,
              sol_after_comment: state.sol_after_comment,

              objects_candname: state.objects_candname,
              objects_section: state.objects_section,
              objects_spritematrix: state.objects_spritematrix.concat([]),

              tokenIndex: state.tokenIndex,

              current_line_wip_array: state.current_line_wip_array.concat([]),

              legend_synonyms: legend_synonymsCopy,
              legend_aggregates: legend_aggregatesCopy,
              legend_properties: legend_propertiesCopy,

              sounds: soundsCopy,
              musics: musicsCopy,

              rules: rulesCopy,

              names: state.names.concat([]),

              winconditions: winConditionsCopy,

              original_case_names : original_case_namesCopy,
              original_line_numbers : original_line_numbersCopy,

              abbrevNames: state.abbrevNames.concat([]),

              metadata : state.metadata.concat([]),
              metadata_lines: Object.assign({}, state.metadata_lines),

              levels: levelsCopy,

              STRIDE_OBJ : state.STRIDE_OBJ,
              STRIDE_MOV : state.STRIDE_MOV
            };

            return nstate;        
        },
        blankLine: function(state) {
            if (state.section === 'levels') {
                    if (state.levels[state.levels.length - 1].length > 0)
                    {
                        state.levels.push([]);
                    }
            }
        },
        token: function(stream, state) {
           	var mixedCase = stream.string;
            var sol = stream.sol();
            if (sol) {
                
                state.current_line_wip_array = [];
                stream.string = stream.string.toLowerCase();
                state.tokenIndex=0;
                state.line_should_end = false;
                /*   if (state.lineNumber==undefined) {
                        state.lineNumber=1;
                }
                else {
                    state.lineNumber++;
                }*/

            }
            if (state.sol_after_comment){
                sol = true;
                state.sol_after_comment = false;
            }



            stream.eatWhile(/[ \t]/);

            ////////////////////////////////
            // COMMENT PROCESSING BEGIN
            ////////////////////////////////

            //NESTED COMMENTS
            var ch = stream.peek();
            if (ch === '(' && state.tokenIndex !== -4) { // tokenIndex -4 indicates message command
                stream.next();
                state.commentLevel++;
            } else if (ch === ')') {
                stream.next();
                if (state.commentLevel > 0) {
                    state.commentLevel--;
                    if (state.commentLevel === 0) {
                        return 'comment';
                    }
                } else {
                    logWarning("You're trying to close a comment here, but I can't find any opening bracket to match it? [This is highly suspicious; you probably want to fix it.]",state.lineNumber);
                    return 'ERROR';
                }
            }
            if (state.commentLevel > 0) {
                if (sol) {
                    state.sol_after_comment = true;
                }
                while (true) {
                    stream.eatWhile(/[^\(\)]+/);

                    if (stream.eol()) {
                        break;
                    }

                    ch = stream.peek();

                    if (ch === '(') {
                        state.commentLevel++;
                    } else if (ch === ')') {
                        state.commentLevel--;
                    }
                    stream.next();

                    if (state.commentLevel === 0) {
                        break;
                    }
                }
                
                if (stream.eol()){
                    endOfLineProcessing(state,mixedCase);  
                }
                return 'comment';
            }

            stream.eatWhile(/[ \t]/);

            if (sol && stream.eol()) {                
                endOfLineProcessing(state,mixedCase);  
                return blankLineHandle(state);
            }

            if (state.line_should_end && !stream.eol()) {
                logError('Only comments should go after ' + state.line_should_end_because + ' on a line.', state.lineNumber);
                stream.skipToEnd();
                return 'ERROR';
            }            

            //MATCH '==="s AT START OF LINE
            if (sol && stream.match(reg_equalsrow, true)) {
                state.line_should_end = true;
                state.line_should_end_because = 'a bunch of equals signs (\'===\')';
                return 'EQUALSBIT';
            }

            //MATCH SECTION NAME
            var sectionNameMatches = stream.match(reg_sectionNames, true);
            if (sol && sectionNameMatches ) {

                state.section = sectionNameMatches[0].trim();
                if (state.visitedSections.indexOf(state.section) >= 0) {
                    logError('cannot duplicate sections (you tried to duplicate \"' + state.section.toUpperCase() + '").', state.lineNumber);
                }
                state.line_should_end = true;
                state.line_should_end_because = `a section name ("${state.section.toUpperCase()}")`;
                state.visitedSections.push(state.section);
                var sectionIndex = sectionNames.indexOf(state.section);
                if (sectionIndex == 0) {
                    state.objects_section = 0;
                    if (state.visitedSections.length > 1) {
                        logError('section "' + state.section.toUpperCase() + '" must be the first section', state.lineNumber);
                    }
                } else if (state.visitedSections.indexOf(sectionNames[sectionIndex - 1]) == -1) {
                    if (sectionIndex===-1) {
                        logError('no such section as "' + state.section.toUpperCase() + '".', state.lineNumber);
                    } else {
                        logError('section "' + state.section.toUpperCase() + '" is out of order, must follow  "' + sectionNames[sectionIndex - 1].toUpperCase() + '" (or it could be that the section "'+sectionNames[sectionIndex - 1].toUpperCase()+`"is just missing totally.  You have to include all section headings, even if the section itself is empty).`, state.lineNumber);                            
                    }
                }

                if (state.section === 'sounds') {
                    //populate names from rules
                    for (var n in state.objects) {
                        if (state.objects.hasOwnProperty(n)) {
/*                                if (state.names.indexOf(n)!==-1) {
                                logError('Object "'+n+'" has been declared to be multiple different things',state.objects[n].lineNumber);
                            }*/
                            state.names.push(n);
                        }
                    }
                    //populate names from legends
                    for (var i = 0; i < state.legend_synonyms.length; i++) {
                        var n = state.legend_synonyms[i][0];
                        /*
                        if (state.names.indexOf(n)!==-1) {
                            logError('Object "'+n+'" has been declared to be multiple different things',state.legend_synonyms[i].lineNumber);
                        }
                        */
                        state.names.push(n);
                    }
                    for (var i = 0; i < state.legend_aggregates.length; i++) {
                        var n = state.legend_aggregates[i][0];
                        /*
                        if (state.names.indexOf(n)!==-1) {
                            logError('Object "'+n+'" has been declared to be multiple different things',state.legend_aggregates[i].lineNumber);
                        }
                        */
                        state.names.push(n);
                    }
                    for (var i = 0; i < state.legend_properties.length; i++) {
                        var n = state.legend_properties[i][0];
                        /*
                        if (state.names.indexOf(n)!==-1) {
                            logError('Object "'+n+'" has been declared to be multiple different things',state.legend_properties[i].lineNumber);
                        }                           
                        */ 
                        state.names.push(n);
                    }
                }
                if (state.section === 'musics') {
                    //populate names from rules
                    for (var n in state.objects) {
                        if (state.objects.hasOwnProperty(n)) {
/*                                if (state.names.indexOf(n)!==-1) {
                                logError('Object "'+n+'" has been declared to be multiple different things',state.objects[n].lineNumber);
                            }*/
                            state.names.push(n);
                        }
                    }
                    //populate names from legends
                    for (var i = 0; i < state.legend_synonyms.length; i++) {
                        var n = state.legend_synonyms[i][0];
                        /*
                        if (state.names.indexOf(n)!==-1) {
                            logError('Object "'+n+'" has been declared to be multiple different things',state.legend_synonyms[i].lineNumber);
                        }
                        */
                        state.names.push(n);
                    }
                    for (var i = 0; i < state.legend_aggregates.length; i++) {
                        var n = state.legend_aggregates[i][0];
                        /*
                        if (state.names.indexOf(n)!==-1) {
                            logError('Object "'+n+'" has been declared to be multiple different things',state.legend_aggregates[i].lineNumber);
                        }
                        */
                        state.names.push(n);
                    }
                    for (var i = 0; i < state.legend_properties.length; i++) {
                        var n = state.legend_properties[i][0];
                        /*
                        if (state.names.indexOf(n)!==-1) {
                            logError('Object "'+n+'" has been declared to be multiple different things',state.legend_properties[i].lineNumber);
                        }                           
                        */ 
                        state.names.push(n);
                    }
                }
                else if (state.section === 'levels') {
                    //populate character abbreviations
                    for (var n in state.objects) {
                        if (state.objects.hasOwnProperty(n) && n.length == 1) {
                            state.abbrevNames.push(n);
                        }
                    }

                    for (var i = 0; i < state.legend_synonyms.length; i++) {
                        if (state.legend_synonyms[i][0].length == 1) {
                            state.abbrevNames.push(state.legend_synonyms[i][0]);
                        }
                    }
                    for (var i = 0; i < state.legend_aggregates.length; i++) {
                        if (state.legend_aggregates[i][0].length == 1) {
                            state.abbrevNames.push(state.legend_aggregates[i][0]);
                        }
                    }
                }
                return 'HEADER';
            } else {
                if (state.section === undefined) {
                    logError('must start with section "OBJECTS"', state.lineNumber);
                }
            }

            if (stream.eol()) {
                
                endOfLineProcessing(state,mixedCase);  
                return null;
            }

            //if color is set, try to set matrix
            //if can't set matrix, try to parse name
            //if color is not set, try to parse color
            switch (state.section) {
            case 'objects':
                {
                    var tryParseName = function() {
                        //LOOK FOR NAME
                        var match_name = sol ? stream.match(reg_name, true) : stream.match(/[^\p{Z}\s\()]+[\p{Z}\s]*/u,true);
                        if (match_name == null) {
                            stream.match(reg_notcommentstart, true);
                            if (stream.pos>0){                                
                                logWarning('Unknown junk in object section (possibly: sprites have to be 5 pixels wide and 5 pixels high exactly. Or maybe: the main names for objects have to be words containing only the letters a-z0.9 - if you want to call them something like ",", do it in the legend section).',state.lineNumber);
                            }
                            return 'ERROR';
                        } else {
                            var candname = match_name[0].trim();
                            if (state.objects[candname] !== undefined) {
                                logError('Object "' + candname.toUpperCase() + '" defined multiple times.', state.lineNumber);
                                return 'ERROR';
                            }
                            for (var i=0;i<state.legend_synonyms.length;i++) {
                                var entry = state.legend_synonyms[i];
                                if (entry[0]==candname) {
                                    logError('Name "' + candname.toUpperCase() + '" already in use.', state.lineNumber);                                		
                                }
                            }
                            if (keyword_array.indexOf(candname)>=0) {
                                logWarning('You named an object "' + candname.toUpperCase() + '", but this is a keyword. Don\'t do that!', state.lineNumber);
                            }

                            if (sol) {
                                state.objects_candname = candname;
                                registerOriginalCaseName(state,candname,mixedCase,state.lineNumber);
                                state.objects[state.objects_candname] = {
                                                                        lineNumber: state.lineNumber,
                                                                        colors: [],
                                                                        spritematrix: []
                                                                    };

                            } else {
                                //set up alias
                                registerOriginalCaseName(state,candname,mixedCase,state.lineNumber);
                                var synonym = [candname,state.objects_candname];
                                synonym.lineNumber = state.lineNumber;
                                state.legend_synonyms.push(synonym);
                            }
                            state.objects_section = 1;
                            return 'NAME';
                        }
                    };

                    if (sol && state.objects_section == 2) {
                        state.objects_section = 3;
                    }

                    if (sol && state.objects_section == 1) {
                        state.objects_section = 2;
                    }

                    switch (state.objects_section) {
                    case 0:
                    case 1:
                        {
                            state.objects_spritematrix = [];
                            return tryParseName();
                            break;
                        }
                    case 2:
                        {
                            //LOOK FOR COLOR
                            state.tokenIndex = 0;

                            var match_color = stream.match(reg_color, true);
                            if (match_color == null) {
                                var str = stream.match(reg_name, true) || stream.match(reg_notcommentstart, true);
                                logError('Was looking for color for object ' + state.objects_candname.toUpperCase() + ', got "' + str + '" instead.', state.lineNumber);
                                return null;
                            } else {
                                if (state.objects[state.objects_candname].colors === undefined) {
                                    state.objects[state.objects_candname].colors = [match_color[0].trim()];
                                } else {
                                    state.objects[state.objects_candname].colors.push(match_color[0].trim());
                                }

                                var candcol = match_color[0].trim().toLowerCase();
                                if (candcol in colorPalettes.arnecolors) {
                                    return 'COLOR COLOR-' + candcol.toUpperCase();
                                } else if (candcol==="transparent") {
                                    return 'COLOR FADECOLOR';
                                } else {
                                    return 'MULTICOLOR'+match_color[0];
                                }
                            }
                            break;
                        }
                    case 3:
                        {
                            var ch = stream.eat(/[.\d]/);
                            var spritematrix = state.objects_spritematrix;
                            if (ch === undefined) {
                                if (spritematrix.length === 0) {
                                    return tryParseName();
                                }
                                logError('Unknown junk in spritematrix for object ' + state.objects_candname.toUpperCase() + '.', state.lineNumber);
                                stream.match(reg_notcommentstart, true);
                                return null;
                            }

                            if (sol) {
                                spritematrix.push('');
                            }

                            var o = state.objects[state.objects_candname];

                            spritematrix[spritematrix.length - 1] += ch;
                            if (spritematrix[spritematrix.length-1].length>5){
                                logWarning('Sprites must be 5 wide and 5 high.', state.lineNumber);
                                stream.match(reg_notcommentstart, true);
                                return null;
                            }
                            o.spritematrix = state.objects_spritematrix;
                            if (spritematrix.length === 5 && spritematrix[spritematrix.length - 1].length == 5) {
                                state.objects_section = 0;
                            }

                            if (ch!=='.') {
                                var n = parseInt(ch);
                                if (n>=o.colors.length) {
                                    logError("Trying to access color number "+n+" from the color palette of sprite " +state.objects_candname.toUpperCase()+", but there are only "+o.colors.length+" defined in it.",state.lineNumber);
                                    return 'ERROR';
                                }
                                if (isNaN(n)) {
                                    logError('Invalid character "' + ch + '" in sprite for ' + state.objects_candname.toUpperCase(), state.lineNumber);
                                    return 'ERROR';
                                }
                                return 'COLOR BOLDCOLOR COLOR-' + o.colors[n].toUpperCase();
                            }
                            return 'COLOR FADECOLOR';
                        }
                    default:
                        {
                        window.console.logError("EEK shouldn't get here.");
                        }
                    }
                    break;
                }
            case 'legend':
                {
                    var resultToken="";
                    var match_name=null;
                    if (state.tokenIndex === 0) {
                        match_name=stream.match(/[^=\p{Z}\s\(]*(\p{Z}\s)*/u, true);
                        var new_name=match_name[0].trim();
                        
                        if (wordAlreadyDeclared(state,new_name))
                        {
                            resultToken =  'ERROR';
                        } else {
                            resultToken =  'NAME';    
                        }

                        //if name already declared, we have a problem                            
                        state.tokenIndex++;
                    } else if (state.tokenIndex === 1) {
                        match_name = stream.match(/=/u,true);                              
                        if (match_name===null||match_name[0].trim()!=="="){
                            logError(`In the legend, define new items using the equals symbol - declarations must look like "A = B", "A = B or C [ or D ...]", "A = B and C [ and D ...]".`, state.lineNumber);
                            stream.match(reg_notcommentstart, true);
                            resultToken = 'ERROR';
                            match_name=["ERROR"];//just to reduce the chance of crashes
                        }
                        stream.match(/[\p{Z}\s]*/u, true);
                        state.tokenIndex++;
                        resultToken = 'ASSSIGNMENT';
                    } else if (state.tokenIndex >= 3 && ((state.tokenIndex % 2) === 1)) {
                        //matches AND/OR
                        match_name = stream.match(reg_name, true);
                        if (match_name === null) {
                            logError("Something bad's happening in the LEGEND", state.lineNumber);
                            match=stream.match(reg_notcommentstart, true);
                            resultToken = 'ERROR';
                        } else {
                            var candname = match_name[0].trim();
                            if (candname === "and" || candname === "or"){                                             
                                resultToken =  'LOGICWORD';
                                if (state.tokenIndex>=5){
                                    if (candname !== state.current_line_wip_array[3]){
                                        logError("Hey! You can't go mixing ANDs and ORs in a single legend entry.", state.lineNumber);
                                        resultToken = 'ERROR';
                                    }
                                }
                            } else {
                                logError(`Expected and 'AND' or an 'OR' here, but got ${candname.toUpperCase()} instead. In the legend, define new items using the equals symbol - declarations must look like 'A = B' or 'A = B and C' or 'A = B or C'.`, state.lineNumber);
                                resultToken = 'ERROR';
                                // match_name=["and"];//just to reduce the chance of crashes
                            }
                        }
                        state.tokenIndex++;
                    }
                    else {
                        match_name = stream.match(reg_name, true);
                        if (match_name === null) {
                            logError("Something bad's happening in the LEGEND", state.lineNumber);
                            match=stream.match(reg_notcommentstart, true);
                            resultToken = 'ERROR';
                        } else {
                            var candname = match_name[0].trim();
                            if (wordAlreadyDeclared(state,candname))
                            {
                                resultToken =  'NAME';    
                            } else {
                                resultToken =  'ERROR';
                            }
                            state.tokenIndex++;

                        }
                    }

                    if (match_name!==null){
                        state.current_line_wip_array.push(match_name[0].trim());
                    }
                    
                    if (stream.eol()){
                        processLegendLine(state,mixedCase);
                    }               

                    return resultToken;
                    break;
                }
            case 'sounds':
                {
                    /*
                    SOUND DEFINITION:
                        SOUNDEVENT ~ INT (Sound events take precedence if there's name overlap)
                        OBJECT_NAME
                            NONDIRECTIONAL_VERB ~ INT
                            DIRECTIONAL_VERB
                                INT
                                DIR+ ~ INT
                    */
                    var tokentype="";

                    if (state.current_line_wip_array.length>0 && state.current_line_wip_array[state.current_line_wip_array.length-1]==='ERROR'){
                        // match=stream.match(reg_notcommentstart, true);
                        //if there was an error earlier on the line just try to do greedy matching here
                        var match = null;

                        //events
                        if (match === null) { 
                            match = stream.match(reg_soundevents, true);
                            if (match !== null) { 
                                tokentype = 'SOUNDEVENT';
                            }
                        }

                        //verbs
                        if (match === null) { 
                            match = stream.match(reg_soundverbs, true);
                            if (match !== null) {
                                tokentype = 'SOUNDVERB';
                            }
                        }
                        //directions
                        if (match === null) { 
                            match = stream.match(reg_sounddirectionindicators, true);
                            if (match !== null) {
                                tokentype = 'DIRECTION';
                            }
                        }

                        //sound seeds
                        if (match === null) {                                           
                            var match = stream.match(reg_soundseed, true);
                            if (match !== null)
                            {
                                tokentype = 'SOUND';
                            }
                        }

                        //objects
                        if (match === null) { 
                            match = stream.match(reg_name, true);
                            if (match !== null) {
                                if (wordAlreadyDeclared(state, match[0])){
                                    tokentype = 'NAME';
                                } else {
                                    tokentype = 'ERROR';                   
                                }
                            }                          
                        }

                        //error
                        if (match === null) { 
                            match = errorFallbackMatchToken(stream);
                            tokentype = 'ERROR';                            
                        }


                    } else if (state.current_line_wip_array.length===0){
                        //can be OBJECT_NAME or SOUNDEVENT
                        var match = stream.match(reg_soundevents, true);
                        if (match == null){
                            match = stream.match(reg_name, true);
                            if (match == null ){
                                tokentype = 'ERROR';
                                match=errorFallbackMatchToken(stream);
                                state.current_line_wip_array.push("ERROR");
                                logWarning("Was expecting a sound event (like SFX3, or ENDLEVEL) or an object name, but didn't find either.", state.lineNumber);                        
                            } else {
                                var matched_name = match[0].trim();
                                if (!wordAlreadyDeclared(state, matched_name)){                 
                                    tokentype = 'ERROR';
                                    state.current_line_wip_array.push("ERROR");
                                    logError(`unexpected sound token "${matched_name}".`, state.lineNumber);
                                } else {                                    
                                    tokentype = 'NAME';
                                    state.current_line_wip_array.push([matched_name,tokentype]);    
                                    state.tokenIndex++;
                                }
                            }
                        } else {
                            tokentype = 'SOUNDEVENT';
                            state.current_line_wip_array.push([match[0].trim(),tokentype]);  
                            state.tokenIndex++;  
                        }

                    } else if (state.current_line_wip_array.length===1) {
                        var is_soundevent = state.current_line_wip_array[0][1] === 'SOUNDEVENT';

                        if (is_soundevent){                            
                            var match = stream.match(reg_soundseed, true);
                            if (match !== null)
                            {
                                tokentype = 'SOUND';
                                state.current_line_wip_array.push([match[0].trim(),tokentype]);
                                state.tokenIndex++;
                            } else {
                                match=errorFallbackMatchToken(stream);
                                logError("Was expecting a sound seed here (a number like 123123, like you generate by pressing the buttons above the console panel), but found something else.", state.lineNumber);                                
                                tokentype = 'ERROR';
                                state.current_line_wip_array.push("ERROR");
                            }
                        } else {
                            //[0] is object name
                            //it's a sound verb
                            var match = stream.match(reg_soundverbs, true);
                            if (match !== null){
                                tokentype = 'SOUNDVERB';
                                state.current_line_wip_array.push([match[0].trim(),tokentype]);
                                state.tokenIndex++;
                            } else {
                                match=errorFallbackMatchToken(stream);
                                logError("Was expecting a soundverb here (MOVE, DESTROY, CANTMOVE, or the like), but found something else.", state.lineNumber);                                
                                tokentype = 'ERROR';
                                state.current_line_wip_array.push("ERROR");
                            }
                            
                        }
                    } else {
                        var is_soundevent = state.current_line_wip_array[0][1] === 'SOUNDEVENT';
                        if (is_soundevent){
                            match=errorFallbackMatchToken(stream);
                            logError(`I wasn't expecting anything after the sound declaration ${state.current_line_wip_array[state.current_line_wip_array.length-1][0].toUpperCase()} on this line, so I don't know what to do with "${match[0].trim().toUpperCase()}" here.`, state.lineNumber);
                            tokentype = 'ERROR';
                            state.current_line_wip_array.push("ERROR");
                        } else {                            
                            //if there's a seed on the right, any additional content is superfluous
                            var is_seedonright = state.current_line_wip_array[state.current_line_wip_array.length-1][1] === 'SOUND';
                            if (is_seedonright){
                                match=errorFallbackMatchToken(stream);
                                logError(`I wasn't expecting anything after the sound declaration ${state.current_line_wip_array[state.current_line_wip_array.length-1][0].toUpperCase()} on this line, so I don't know what to do with "${match[0].trim().toUpperCase()}" here.`, state.lineNumber);
                                tokentype = 'ERROR';
                                state.current_line_wip_array.push("ERROR");
                            } else {
                                var directional_verb = soundverbs_directional.indexOf(state.current_line_wip_array[1][0])>=0;    
                                if (directional_verb){  
                                    //match seed or direction                          
                                    var is_direction = stream.match(reg_sounddirectionindicators, true);
                                    if (is_direction !== null){
                                        tokentype = 'DIRECTION';
                                        state.current_line_wip_array.push([is_direction[0].trim(),tokentype]);
                                        state.tokenIndex++;
                                    } else {
                                        var is_seed = stream.match(reg_soundseed, true);
                                        if (is_seed !== null){
                                            tokentype = 'SOUND';
                                            state.current_line_wip_array.push([is_seed[0].trim(),tokentype]);
                                            state.tokenIndex++;
                                        } else {
                                            match=errorFallbackMatchToken(stream);
                                            //depending on whether the verb is directional or not, we log different errors
                                            logError(`Ah I was expecting direction or a sound seed here after ${state.current_line_wip_array[state.current_line_wip_array.length-1][0].toUpperCase()}, but I don't know what to make of "${match[0].trim().toUpperCase()}".`, state.lineNumber);
                                            tokentype = 'ERROR';
                                            state.current_line_wip_array.push("ERROR");
                                        }
                                    }
                                } else {
                                    //only match seed
                                    var is_seed = stream.match(reg_soundseed, true);
                                    if (is_seed !== null){
                                        tokentype = 'SOUND';
                                        state.current_line_wip_array.push([is_seed[0].trim(),tokentype]);
                                        state.tokenIndex++;
                                    } else {
                                        match=errorFallbackMatchToken(stream);
                                        //depending on whether the verb is directional or not, we log different errors
                                        logError(`Ah I was expecting a sound seed here after ${state.current_line_wip_array[state.current_line_wip_array.length-1][0].toUpperCase()}, but I don't know what to make of "${match[0].trim().toUpperCase()}".`, state.lineNumber);
                                        tokentype = 'ERROR';
                                        state.current_line_wip_array.push("ERROR");
                                    }
                                }
                            }
                        }
                    }

                    if (stream.eol()){
                        processSoundsLine(state);
                    }     

                    return tokentype;

                    break;
                }
            case 'musics':
                {
                    /*
                    SOUND DEFINITION:
                        SOUNDEVENT ~ INT (Sound events take precedence if there's name overlap)
                        OBJECT_NAME
                            NONDIRECTIONAL_VERB ~ INT
                            DIRECTIONAL_VERB
                                INT
                                DIR+ ~ INT
                    */
                    var tokentype="";

                    if (state.current_line_wip_array.length>0 && state.current_line_wip_array[state.current_line_wip_array.length-1]==='ERROR'){
                        // match=stream.match(reg_notcommentstart, true);
                        //if there was an error earlier on the line just try to do greedy matching here
                        var match = null;

                        //events
                        if (match === null) { 
                            match = stream.match(reg_musicevents, true);
                            if (match !== null) { 
                                tokentype = 'MUSICEVENT';
                            }
                        }

                        //verbs
                        if (match === null) { 
                            match = stream.match(reg_musicverbs, true);
                            if (match !== null) {
                                tokentype = 'MUSICVERB';
                            }
                        }
                        //directions
                        if (match === null) { 
                            match = stream.match(reg_musicdirectionindicators, true);
                            if (match !== null) {
                                tokentype = 'DIRECTION';
                            }
                        }

                        //sound seeds
                        if (match === null) {                                           
                            var match = stream.match(reg_mml, true);
                            if (match !== null)
                            {
                                tokentype = 'MUSIC';
                            }
                        }

                        //objects
                        if (match === null) { 
                            match = stream.match(reg_name, true);
                            if (match !== null) {
                                if (wordAlreadyDeclared(state, match[0])){
                                    tokentype = 'NAME';
                                } else {
                                    tokentype = 'ERROR';                   
                                }
                            }                          
                        }

                        //error
                        if (match === null) { 
                            match = errorFallbackMatchToken(stream);
                            tokentype = 'ERROR';                            
                        }


                    } else if (state.current_line_wip_array.length===0){
                        //can be OBJECT_NAME or SOUNDEVENT
                        var match = stream.match(reg_musicevents, true);
                        if (match == null){
                            match = stream.match(reg_name, true);
                            if (match == null ){
                                tokentype = 'ERROR';
                                match=errorFallbackMatchToken(stream);
                                state.current_line_wip_array.push("ERROR");
                                logWarning("Was expecting a music event (like BGM3, or ENDLEVEL) or an object name, but didn't find either.", state.lineNumber);                        
                            } else {
                                var matched_name = match[0].trim();
                                if (!wordAlreadyDeclared(state, matched_name)){                 
                                    tokentype = 'ERROR';
                                    state.current_line_wip_array.push("ERROR");
                                    logError(`unexpected music token "${matched_name}".`, state.lineNumber);
                                } else {                                    
                                    tokentype = 'NAME';
                                    state.current_line_wip_array.push([matched_name,tokentype]);    
                                    state.tokenIndex++;
                                }
                            }
                        } else {
                            tokentype = 'MUSICEVENT';
                            state.current_line_wip_array.push([match[0].trim(),tokentype]);  
                            state.tokenIndex++;  
                        }

                    } else if (state.current_line_wip_array.length===1) {
                        var is_musicevent = state.current_line_wip_array[0][1] === 'MUSICEVENT';

                        if (is_musicevent){                            
                            var match = stream.match(reg_mml, true);
                            if (match !== null)
                            {
                                tokentype = 'MUSIC';
                                state.current_line_wip_array.push([match[0].trim(),tokentype]);
                                state.tokenIndex++;
                            } else {
                                match=errorFallbackMatchToken(stream);
                                logError("Was expecting a music mml here (like \"t100 l8 cegedc\"), but found something else.", state.lineNumber);                                
                                tokentype = 'ERROR';
                                state.current_line_wip_array.push("ERROR");
                            }
                        } else {
                            //[0] is object name
                            //it's a sound verb
                            var match = stream.match(reg_musicverbs, true);
                            if (match !== null){
                                tokentype = 'MUSICVERB';
                                state.current_line_wip_array.push([match[0].trim(),tokentype]);
                                state.tokenIndex++;
                            } else {
                                match=errorFallbackMatchToken(stream);
                                logError("Was expecting a musicverb here (MOVE, DESTROY, CANTMOVE, or the like), but found something else.", state.lineNumber);                                
                                tokentype = 'ERROR';
                                state.current_line_wip_array.push("ERROR");
                            }
                            
                        }
                    } else {
                        var is_musicevent = state.current_line_wip_array[0][1] === 'MUSICEVENT';
                        if (is_musicevent){
                            match=errorFallbackMatchToken(stream);
                            logError(`I wasn't expecting anything after the music declaration ${state.current_line_wip_array[state.current_line_wip_array.length-1][0].toUpperCase()} on this line, so I don't know what to do with "${match[0].trim().toUpperCase()}" here.`, state.lineNumber);
                            tokentype = 'ERROR';
                            state.current_line_wip_array.push("ERROR");
                        } else {                            
                            //if there's a seed on the right, any additional content is superfluous
                            var is_seedonright = state.current_line_wip_array[state.current_line_wip_array.length-1][1] === 'MUSIC';
                            if (is_seedonright){
                                match=errorFallbackMatchToken(stream);
                                logError(`I wasn't expecting anything after the music declaration ${state.current_line_wip_array[state.current_line_wip_array.length-1][0].toUpperCase()} on this line, so I don't know what to do with "${match[0].trim().toUpperCase()}" here.`, state.lineNumber);
                                tokentype = 'ERROR';
                                state.current_line_wip_array.push("ERROR");
                            } else {
                                var directional_verb = musicverbs_directional.indexOf(state.current_line_wip_array[1][0])>=0;    
                                if (directional_verb){  
                                    //match seed or direction                          
                                    var is_direction = stream.match(reg_musicdirectionindicators, true);
                                    if (is_direction !== null){
                                        tokentype = 'DIRECTION';
                                        state.current_line_wip_array.push([is_direction[0].trim(),tokentype]);
                                        state.tokenIndex++;
                                    } else {
                                        var is_seed = stream.match(reg_mml, true);
                                        if (is_seed !== null){
                                            tokentype = 'MUSIC';
                                            state.current_line_wip_array.push([is_seed[0].trim(),tokentype]);
                                            state.tokenIndex++;
                                        } else {
                                            match=errorFallbackMatchToken(stream);
                                            //depending on whether the verb is directional or not, we log different errors
                                            logError(`Ah I was expecting direction or a music mml here after ${state.current_line_wip_array[state.current_line_wip_array.length-1][0].toUpperCase()}, but I don't know what to make of "${match[0].trim().toUpperCase()}".`, state.lineNumber);
                                            tokentype = 'ERROR';
                                            state.current_line_wip_array.push("ERROR");
                                        }
                                    }
                                } else {
                                    //only match seed
                                    var is_seed = stream.match(reg_mml, true);
                                    if (is_seed !== null){
                                        tokentype = 'MUSIC';
                                        state.current_line_wip_array.push([is_seed[0].trim(),tokentype]);
                                        state.tokenIndex++;
                                    } else {
                                        match=errorFallbackMatchToken(stream);
                                        //depending on whether the verb is directional or not, we log different errors
                                        logError(`Ah I was expecting a music mml here after ${state.current_line_wip_array[state.current_line_wip_array.length-1][0].toUpperCase()}, but I don't know what to make of "${match[0].trim().toUpperCase()}".`, state.lineNumber);
                                        tokentype = 'ERROR';
                                        state.current_line_wip_array.push("ERROR");
                                    }
                                }
                            }
                        }
                    }

                    if (stream.eol()){
                        processMusicsLine(state);
                    }     

                    return tokentype;

                    break;
                }
            case 'collisionlayers':
                {
                    if (sol) {
                        //create new collision layer
                        state.collisionLayers.push([]);
                        //empty current_line_wip_array
                        state.current_line_wip_array = [];
                        state.tokenIndex=0;
                    }

                    var match_name = stream.match(reg_name, true);
                    if (match_name === null) {
                        //then strip spaces and commas
                        var prepos=stream.pos;
                        stream.match(reg_csv_separators, true);
                        if (stream.pos==prepos) {
                            logError("error detected - unexpected character " + stream.peek(),state.lineNumber);
                            stream.next();
                        }
                        return null;
                    } else {
                        //have a name: let's see if it's valid
                        var candname = match_name[0].trim();

                        var substitutor = function(n) {
                            n = n.toLowerCase();
                            if (n in state.objects) {
                                return [n];
                            } 


                            for (var i=0;i<state.legend_synonyms.length;i++) {
                                var a = state.legend_synonyms[i];
                                if (a[0]===n) {           
                                    return substitutor(a[1]);
                                }
                            }

                            for (var i=0;i<state.legend_aggregates.length;i++) {
                                var a = state.legend_aggregates[i];
                                if (a[0]===n) {           
                                    logError('"'+n+'" is an aggregate (defined using "and"), and cannot be added to a single layer because its constituent objects must be able to coexist.', state.lineNumber);
                                    return [];         
                                }
                            }
                            for (var i=0;i<state.legend_properties.length;i++) {
                                var a = state.legend_properties[i];
                                if (a[0]===n) {  
                                    var result = [];
                                    for (var j=1;j<a.length;j++){
                                        if (a[j]===n){
                                            //error here superfluous, also detected elsewhere (cf 'You can't define object' / #789)
                                            //logError('Error, recursive definition found for '+n+'.', state.lineNumber);                                
                                        } else {
                                            result = result.concat(substitutor(a[j]));
                                        }
                                    }
                                    return result;
                                }
                            }
                            logError('Cannot add "' + candname.toUpperCase() + '" to a collision layer; it has not been declared.', state.lineNumber);                                
                            return [];
                        };
                        if (candname==='background' ) {
                            if (state.collisionLayers.length>0&&state.collisionLayers[state.collisionLayers.length-1].length>0) {
                                logError("Background must be in a layer by itself.",state.lineNumber);
                            }
                            state.tokenIndex=1;
                        } else if (state.tokenIndex!==0) {
                            logError("Background must be in a layer by itself.",state.lineNumber);
                        }

                        var ar = substitutor(candname);

                        if (state.collisionLayers.length===0) {
                            logError("no layers found.",state.lineNumber);
                            return 'ERROR';
                        }
                        
                        var foundOthers=[];
                        var foundSelves=[];
                        for (var i=0;i<ar.length;i++){
                            var tcandname = ar[i];
                            for (var j=0;j<=state.collisionLayers.length-1;j++){
                                var clj = state.collisionLayers[j];
                                if (clj.indexOf(tcandname)>=0){
                                    if (j!==state.collisionLayers.length-1){
                                        foundOthers.push(j);
                                    } else {
                                        foundSelves.push(j);
                                    }
                                }
                            }
                        }
                        if (foundOthers.length>0){
                            var warningStr = 'Object "'+candname.toUpperCase()+'" included in multiple collision layers ( layers ';
                            for (var i=0;i<foundOthers.length;i++){
                                warningStr+="#"+(foundOthers[i]+1)+", ";
                            }
                            warningStr+="#"+state.collisionLayers.length;
                            logWarning(warningStr +' ). You should fix this!',state.lineNumber);                                        
                        }

                        if (state.current_line_wip_array.indexOf(candname)>=0){
                            var warningStr = 'Object "'+candname.toUpperCase()+'" included explicitly multiple times in the same layer. Don\'t do that innit.';
                            logWarning(warningStr,state.lineNumber);         
                        }
                        state.current_line_wip_array.push(candname);

                        state.collisionLayers[state.collisionLayers.length - 1] = state.collisionLayers[state.collisionLayers.length - 1].concat(ar);
                        if (ar.length>0) {
                            return 'NAME';                            
                        } else {
                            return 'ERROR';
                        }
                    }
                    break;
                }
            case 'rules':
                {                    	
                    if (sol) {
                        var rule = reg_notcommentstart.exec(stream.string)[0];
                        state.rules.push([rule, state.lineNumber, mixedCase]);
                        state.tokenIndex = 0;//in rules, records whether bracket has been found or not
                    }

                    if (state.tokenIndex===-4) {
                        stream.skipToEnd();
                        return 'MESSAGE';
                    }
                    if (stream.match(/[\p{Z}\s]*->[\p{Z}\s]*/u, true)) {
                        return 'ARROW';
                    }
                    if (ch === '[' || ch === '|' || ch === ']' || ch==='+') {
                        if (ch!=='+') {
                            state.tokenIndex = 1;
                        }
                        stream.next();
                        stream.match(/[\p{Z}\s]*/u, true);
                        return 'BRACKET';
                    } else {
                        var m = stream.match(/[^\[\|\]\p{Z}\s]*/u, true)[0].trim();

                        if (state.tokenIndex===0&&reg_loopmarker.exec(m)) {
                            return 'BRACKET';
                        } else if (state.tokenIndex === 0 && reg_ruledirectionindicators.exec(m)) {
                            stream.match(/[\p{Z}\s]*/u, true);
                            return 'DIRECTION';
                        } else if (state.tokenIndex === 1 && reg_directions.exec(m)) {
                            stream.match(/[\p{Z}\s]*/u, true);
                            return 'DIRECTION';
                        } else {
                            if (state.names.indexOf(m) >= 0) {
                                if (sol) {
                                    logError('Objects cannot appear outside of square brackets in rules, only directions can.', state.lineNumber);
                                    return 'ERROR';
                                } else {
                                    stream.match(/[\p{Z}\s]*/u, true);
                                    return 'NAME';
                                }
                            } else if (m==='...') {
                                return 'DIRECTION';
                            } else if (m==='rigid') {
                                return 'DIRECTION';
                            } else if (m==='random') {
                                return 'DIRECTION';
                            } else if (commandwords.indexOf(m)>=0) {
                                if (m==='message') {
                                    state.tokenIndex=-4;
                                }                                	
                                return 'COMMAND';
                            } else {
                                logError('Name "' + m + '", referred to in a rule, does not exist.', state.lineNumber);
                                return 'ERROR';
                            }
                        }
                    }

                    break;
                }
            case 'winconditions':
                {
                    if (sol) {
                        var tokenized = reg_notcommentstart.exec(stream.string);
                        var splitted = tokenized[0].split(/[\p{Z}\s]/u);
                        var filtered = splitted.filter(function(v) {return v !== ''});
                        filtered.push(state.lineNumber);
                        
                        state.winconditions.push(filtered);
                        state.tokenIndex = -1;
                    }
                    state.tokenIndex++;

                    var match = stream.match(/[\p{Z}\s]*[\p{L}\p{N}_]+[\p{Z}\s]*/u);
                    if (match === null) {
                            logError('incorrect format of win condition.', state.lineNumber);
                            stream.match(reg_notcommentstart, true);
                            return 'ERROR';

                    } else {
                        var candword = match[0].trim();
                        if (state.tokenIndex === 0) {
                            if (reg_winconditionquantifiers.exec(candword)) {
                                return 'LOGICWORD';
                            }
                            else {
                                logError('Expecting the start of a win condition ("ALL","SOME","NO") but got "'+candword.toUpperCase()+"'.", state.lineNumber);
                                return 'ERROR';
                            }
                        }
                        else if (state.tokenIndex === 2) {
                            if (candword != 'on') {
                                logError('Expecting the word "ON" but got "'+candword.toUpperCase()+"\".", state.lineNumber);
                                return 'ERROR';
                            } else {
                                return 'LOGICWORD';
                            }
                        }
                        else if (state.tokenIndex === 1 || state.tokenIndex === 3) {
                            if (state.names.indexOf(candword)===-1) {
                                logError('Error in win condition: "' + candword.toUpperCase() + '" is not a valid object name.', state.lineNumber);
                                return 'ERROR';
                            } else {
                                return 'NAME';
                            }
                        } else {
                            logError("Error in win condition: I don't know what to do with "+candword.toUpperCase()+".", state.lineNumber);
                            return 'ERROR';
                        }
                    }
                    break;
                }
            case 'levels':
                {
                    if (sol)
                    {
                        if (stream.match(/[\p{Z}\s]*message\b[\p{Z}\s]*/u, true)) {
                            state.tokenIndex = -4;//-4/2 = message/level
                            var newdat = ['\n', mixedCase.slice(stream.pos).trim(),state.lineNumber];
                            if (state.levels[state.levels.length - 1].length == 0) {
                                state.levels.splice(state.levels.length - 1, 0, newdat);
                            } else {
                                state.levels.push(newdat);
                            }
                            return 'MESSAGE_VERB';//a duplicate of the previous section as a legacy thing for #589 
                        } else if (stream.match(/[\p{Z}\s]*message[\p{Z}\s]*/u, true)) {//duplicating previous section because of #589
                            logWarning("You probably meant to put a space after 'message' innit.  That's ok, I'll still interpret it as a message, but you probably want to put a space there.",state.lineNumber);
                            state.tokenIndex = -4;//-4/2 = message/level
                            var newdat = ['\n', mixedCase.slice(stream.pos).trim(),state.lineNumber];
                            if (state.levels[state.levels.length - 1].length == 0) {
                                state.levels.splice(state.levels.length - 1, 0, newdat);
                            } else {
                                state.levels.push(newdat);
                            }
                            return 'MESSAGE_VERB';
                        } else {
                            var matches = stream.match(reg_notcommentstart, false);
                            if (matches===null || matches.length===0){
                                logError("Detected a comment where I was expecting a level. Oh gosh; if this is to do with you using '(' as a character in the legend, please don't do that ^^",state.lineNumber);
                                state.commentLevel++;
                                stream.skipToEnd();
                                return 'comment';
                            } else {
                                var line = matches[0].trim();
                                state.tokenIndex = 2;
                                var lastlevel = state.levels[state.levels.length - 1];
                                if (lastlevel[0] == '\n') {
                                    state.levels.push([state.lineNumber,line]);
                                } else {
                                    if (lastlevel.length==0)
                                    {
                                        lastlevel.push(state.lineNumber);
                                    }
                                    lastlevel.push(line);  

                                    if (lastlevel.length>1) 
                                    {
                                        if (line.length!=lastlevel[1].length) {
                                            logWarning("Maps must be rectangular, yo (In a level, the length of each row must be the same).",state.lineNumber);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        if (state.tokenIndex == -4) {
                            stream.skipToEnd();
                            return 'MESSAGE';
                        }
                    }

                    if (state.tokenIndex === 2 && !stream.eol()) {
                        var ch = stream.peek();
                        stream.next();
                        if (state.abbrevNames.indexOf(ch) >= 0) {
                            return 'LEVEL';
                        } else {
                            logError('Key "' + ch.toUpperCase() + '" not found. Do you need to add it to the legend, or define a new object?', state.lineNumber);
                            return 'ERROR';
                        }
                    }
                    break;
                }
                
                default://if you're in the preamble
                {
                    if (sol) {
                        state.tokenIndex=0;
                    }
                    if (state.tokenIndex==0) {
                        var match = stream.match(/[\p{Z}\s]*[\p{L}\p{N}_]+[\p{Z}\s]*/u);	                    
                        if (match!==null) {
                            var token = match[0].trim();
                            if (sol) {
                                if (['title','author','homepage','background_color','text_color','key_repeat_interval','realtime_interval','again_interval','flickscreen','zoomscreen','color_palette','youtube'].indexOf(token)>=0) {
                                    
                                    if (token==='author' || token==='homepage' || token==='title') {
                                        stream.string=mixedCase;
                                    }

                                    if (token==="youtube") {
                                        logWarning("Unfortunately, YouTube support hasn't been working properly for a long time - it was always a hack and it hasn't gotten less hacky over time, so I can no longer pretend to support it.",state.lineNumber);
                                    }
                                    
                                    var m2 = stream.match(reg_notcommentstart, false);
                                    
                                    if(m2!==null) {
                                        state.metadata.push(token);
                                        state.metadata.push(m2[0].trim());  
                                        if (token in state.metadata_lines){
                                            var otherline = state.metadata_lines[token];
                                            logWarning(`You've already defined a ${token.toUpperCase()} in the prelude on line <a onclick="jumpToLine(${otherline})>${otherline}</a>.`,state.lineNumber);
                                        }
                                        state.metadata_lines[token]=state.lineNumber;                                                                                    
                                    } else {
                                        logError('MetaData "'+token+'" needs a value.',state.lineNumber);
                                    }
                                    state.tokenIndex=1;
                                    return 'METADATA';
                                } else if ( ['run_rules_on_level_start','norepeat_action','require_player_movement','debug','verbose_logging','throttle_movement','noundo','noaction','norestart','scanline'].indexOf(token)>=0) {
                                    state.metadata.push(token);
                                    state.metadata.push("true");
                                    state.tokenIndex=-1;


                                    var m2 = stream.match(reg_notcommentstart, false);
                                    
                                    if(m2!==null) {
                                        var extra = m2[0].trim();      
                                        logWarning('MetaData '+token.toUpperCase()+' doesn\'t take any parameters, but you went and gave it "'+extra+'".',state.lineNumber);                                      
                                    } 

                                    return 'METADATA';
                                } else  {
                                    logError('Unrecognised stuff in the prelude.', state.lineNumber);
                                    return 'ERROR';
                                }
                            } else if (state.tokenIndex==-1) {
                                logError('MetaData "'+token+'" has no parameters.',state.lineNumber);
                                return 'ERROR';
                            }
                            return 'METADATA';
                        }       
                    } else {
                        stream.match(reg_notcommentstart, true);
                        state.tokenIndex++;

                        var key = state [state.metadata.length-3];
                        var val = state.metadata[state.metadata.length-2];
                        var oldLineNum = state.metadata[state.metadata.length-1];

                        if( state.tokenIndex>2){
                            logWarning("Error: you can't embed comments in metadata values. Anything after the comment will be ignored.",state.lineNumber);
                            return 'ERROR';
                        }
						if (key === "background_color" || key === "text_color"){
							var candcol = val.trim().toLowerCase();
                            if (candcol in colorPalettes.arnecolors) {
                                return 'COLOR COLOR-' + candcol.toUpperCase();
                            } else if (candcol==="transparent") {
                                return 'COLOR FADECOLOR';
                            } else if ( (candcol.length===4) || (candcol.length===7)) {
                                var color = candcol.match(/#[0-9a-fA-F]+/);
                                if (color!==null){                
                                    return 'MULTICOLOR'+color[0];
                                }
                            }
                                                       
						}                        
                        return "METADATATEXT";
                    }
                    break;
                }
            }
        

            if (stream.eol()) {
                return null;
            }

            if (!stream.eol()) {
                stream.next();
                return null;
            }
        },
        startState: function() {
            return {
                /*
                    permanently useful
                */
                objects: {},

                /*
                    for parsing
                */
                lineNumber: 0,

                commentLevel: 0,

                section: '',
                visitedSections: [],

                line_should_end: false,
                line_should_end_because: '',
                sol_after_comment: false,

                objects_candname: '',
                objects_section: 0, //whether reading name/color/spritematrix
                objects_spritematrix: [],

                collisionLayers: [],

                tokenIndex: 0,

                current_line_wip_array: [],

                legend_synonyms: [],
                legend_aggregates: [],
                legend_properties: [],

                sounds: [],
                musics: [],
                rules: [],

                names: [],

                winconditions: [],
                metadata: [],
                metadata_lines: {},

                original_case_names: {},
                original_line_numbers: {},

                abbrevNames: [],

                levels: [[]],

                subsection: ''
            };
        }
    };
};

window.CodeMirror.defineMode('puzzle', codeMirrorFn);
