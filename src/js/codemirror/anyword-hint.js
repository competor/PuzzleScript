// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE
(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["../../lib/codemirror"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function(CodeMirror) {
        "use strict";

        var WORD = /[\w$#]+/,
            RANGE = 500;

        var PRELUDE_COMMAND_WORDS = [
            "METADATA",//tag
            ["author", "Gill Bloggs", "Your name goes here. This will appear in the title screen of the game."],
            ["color_palette", "arne", "By default, when you use colour names, they are pulled from a variation of <a href='http://androidarts.com/palette/16pal.htm'>Arne</a>'s 16-Colour palette. However, there are other palettes to choose from: <p> <ul> <li>1 - mastersystem </li> <li>2 - gameboycolour </li> <li>3 - amiga </li> <li>4 - arnecolors </li> <li>5 - famicom </li> <li>6 - atari </li> <li>7 - pastel </li> <li>8 - ega </li> <li>9 - amstrad </li> <li>10 - proteus_mellow </li> <li>11 - proteus_rich </li> <li>12 - proteus_night </li> <li>13 - c64 </li> <li>14 - whitingjp </li> </ul> <p> (you can also refer to them by their numerical index)"],
            ["again_interval", "0.1", "The amount of time it takes an 'again' event to trigger."],
            ["background_color", "blue", "Can accept a color name or hex code (in the form #412bbc). Controls the background color of title/message screens, as well as the background color of the website. Text_color is its sibling."],
            ["debug", "", "This outputs the compiled instructions whenever you build your file."],
            ["flickscreen", "8x5", "Setting flickscreen divides each level into WxH grids, and zooms the camera in so that the player can only see one at a time"],
            ["homepage", "www.puzzlescript.net", "A link to your homepage!"],
            ["key_repeat_interval", "0.1", "When you hold down a key, how long is the delay between repeated presses getting sent to the game (in seconds)?"],
            ["noaction", "", "Hides the action key (X) instruction from the title screen, and does not respond when the player pressed it (outside of menus and cutscenes and the like)."],
            ["norepeat_action", "", "The action button will only respond to individual presses, and not auto-trigger when held down."],
            ["noundo", "", "Disables the undo key (Z)"],
            ["norestart", "", "Disables the restart key (R)"],
            ["realtime_interval", "", "The number indicates how long each realtime frame should be."],
            ["require_player_movement", "", "If the player doesn't move, cancel the whole move."],
            ["run_rules_on_level_start", "", "Applies the rules once on level-load, before the player has moved"],
            ["do_not_stop_music_on_restart", "", "Applies the rules for MML"],
            ["scanline", "", "Applies a scanline visual effect"],
            ["text_color", "orange", "Can accept a color name or hex code (in the form #412bbc). Controls the font color of title/message screens, as well as the font color in the website. Background_color is its sibling."],
            ["title", "My Amazing Puzzle Game", "The name of your game. Appears on the title screen."],
            ["throttle_movement", "", "For use in conjunction with realtime_interval - this stops you from moving crazy fast - repeated keypresses of the same movement direction will not increase your speed. This doesn't apply to the action button."],
            ["verbose_logging", "", "As you play the game, spits out information about all rules applied as you play, and also allows visual inspection of what exactly the rules do by hovering over them with your mouse (or tapping them on touchscreen)."],
            ["zoomscreen", "WxH", "Zooms the camera in to a WxH section of the map around the player, centered on the player."]
        ];

        var COLOR_WORDS = [
            "COLOR",//special tag
            "black", "white", "darkgray", "lightgray", "gray", "red", "darkred", "lightred", "brown", "darkbrown", "lightbrown", "orange", "yellow", "green", "darkgreen", "lightgreen", "blue", "lightblue", "darkblue", "purple", "pink", "transparent"];
        var RULE_COMMAND_WORDS = [
            "COMMAND",
            "sfx0", "sfx1", "sfx2", "sfx3", "sfx4", "sfx5", "sfx6", "sfx7", "sfx8", "sfx9", "sfx10", "sfx11", "sfx12", "sfx13", "sfx14", "sfx15", "sfx16", "sfx17", "sfx18", "sfx19", "sfx20", "sfx21", "sfx22", "sfx23", "sfx24", "sfx25", "sfx26", "sfx27", "sfx28", "sfx29", "sfx30", "sfx31", "sfx32", "sfx33", "sfx34", "sfx35", "sfx36", "sfx37", "sfx38", "sfx39", "sfx40", "sfx41", "sfx42", "sfx43", "sfx44", "sfx45", "sfx46", "sfx47", "sfx48", "sfx49", "sfx50", "sfx51", "sfx52", "sfx53", "sfx54", "sfx55", "sfx56", "sfx57", "sfx58", "sfx59", "sfx60", "sfx61", "sfx62", "sfx63", "sfx64", "sfx65", "sfx66", "sfx67", "sfx68", "sfx69", "sfx70", "sfx71", "sfx72", "sfx73", "sfx74", "sfx75", "sfx76", "sfx77", "sfx78", "sfx79", "sfx80", "sfx81", "sfx82", "sfx83", "sfx84", "sfx85", "sfx86", "sfx87", "sfx88", "sfx89", "sfx90", "sfx91", "sfx92", "sfx93", "sfx94", "sfx95", "sfx96", "sfx97", "sfx98", "sfx99", "sfx100", "sfx101", "sfx102", "sfx103", "sfx104", "sfx105", "sfx106", "sfx107", "sfx108", "sfx109", "sfx110", "sfx111", "sfx112", "sfx113", "sfx114", "sfx115", "sfx116", "sfx117", "sfx118", "sfx119", "sfx120", "sfx121", "sfx122", "sfx123", "sfx124", "sfx125", "sfx126", "sfx127", "sfx128", "sfx129", "sfx130", "sfx131", "sfx132", "sfx133", "sfx134", "sfx135", "sfx136", "sfx137", "sfx138", "sfx139", "sfx140", "sfx141", "sfx142", "sfx143", "sfx144", "sfx145", "sfx146", "sfx147", "sfx148", "sfx149", "sfx150", "sfx151", "sfx152", "sfx153", "sfx154", "sfx155", "sfx156", "sfx157", "sfx158", "sfx159", "sfx160", "sfx161", "sfx162", "sfx163", "sfx164", "sfx165", "sfx166", "sfx167", "sfx168", "sfx169", "sfx170", "sfx171", "sfx172", "sfx173", "sfx174", "sfx175", "sfx176", "sfx177", "sfx178", "sfx179", "sfx180", "sfx181", "sfx182", "sfx183", "sfx184", "sfx185", "sfx186", "sfx187", "sfx188", "sfx189", "sfx190", "sfx191", "sfx192", "sfx193", "sfx194", "sfx195", "sfx196", "sfx197", "sfx198", "sfx199", "sfx200", "sfx201", "sfx202", "sfx203", "sfx204", "sfx205", "sfx206", "sfx207", "sfx208", "sfx209", "sfx210", "sfx211", "sfx212", "sfx213", "sfx214", "sfx215", "sfx216", "sfx217", "sfx218", "sfx219", "sfx220", "sfx221", "sfx222", "sfx223", "sfx224", "sfx225", "sfx226", "sfx227", "sfx228", "sfx229", "sfx230", "sfx231", "sfx232", "sfx233", "sfx234", "sfx235", "sfx236", "sfx237", "sfx238", "sfx239", "sfx240", "sfx241", "sfx242", "sfx243", "sfx244", "sfx245", "sfx246", "sfx247", "sfx248", "sfx249", "sfx250", "sfx251", "sfx252", "sfx253", "sfx254", "sfx255", "sfx256", "sfx257", "sfx258", "sfx259", "sfx260", "sfx261", "sfx262", "sfx263", "sfx264", "sfx265", "sfx266", "sfx267", "sfx268", "sfx269", "sfx270", "sfx271", "sfx272", "sfx273", "sfx274", "sfx275", "sfx276", "sfx277", "sfx278", "sfx279", "sfx280", "sfx281", "sfx282", "sfx283", "sfx284", "sfx285", "sfx286", "sfx287", "sfx288", "sfx289", "sfx290", "sfx291", "sfx292", "sfx293", "sfx294", "sfx295", "sfx296", "sfx297", "sfx298", "sfx299", "sfx300", "sfx301", "sfx302", "sfx303", "sfx304", "sfx305", "sfx306", "sfx307", "sfx308", "sfx309", "sfx310", "sfx311", "sfx312", "sfx313", "sfx314", "sfx315", "sfx316", "sfx317", "sfx318", "sfx319", "sfx320", "sfx321", "sfx322", "sfx323", "sfx324", "sfx325", "sfx326", "sfx327", "sfx328", "sfx329", "sfx330", "sfx331", "sfx332", "sfx333", "sfx334", "sfx335", "sfx336", "sfx337", "sfx338", "sfx339", "sfx340", "sfx341", "sfx342", "sfx343", "sfx344", "sfx345", "sfx346", "sfx347", "sfx348", "sfx349", "sfx350", "sfx351", "sfx352", "sfx353", "sfx354", "sfx355", "sfx356", "sfx357", "sfx358", "sfx359", "sfx360", "sfx361", "sfx362", "sfx363", "sfx364", "sfx365", "sfx366", "sfx367", "sfx368", "sfx369", "sfx370", "sfx371", "sfx372", "sfx373", "sfx374", "sfx375", "sfx376", "sfx377", "sfx378", "sfx379", "sfx380", "sfx381", "sfx382", "sfx383", "sfx384", "sfx385", "sfx386", "sfx387", "sfx388", "sfx389", "sfx390", "sfx391", "sfx392", "sfx393", "sfx394", "sfx395", "sfx396", "sfx397", "sfx398", "sfx399", "sfx400", "sfx401", "sfx402", "sfx403", "sfx404", "sfx405", "sfx406", "sfx407", "sfx408", "sfx409", "sfx410", "sfx411", "sfx412", "sfx413", "sfx414", "sfx415", "sfx416", "sfx417", "sfx418", "sfx419", "sfx420", "sfx421", "sfx422", "sfx423", "sfx424", "sfx425", "sfx426", "sfx427", "sfx428", "sfx429", "sfx430", "sfx431", "sfx432", "sfx433", "sfx434", "sfx435", "sfx436", "sfx437", "sfx438", "sfx439", "sfx440", "sfx441", "sfx442", "sfx443", "sfx444", "sfx445", "sfx446", "sfx447", "sfx448", "sfx449", "sfx450", "sfx451", "sfx452", "sfx453", "sfx454", "sfx455", "sfx456", "sfx457", "sfx458", "sfx459", "sfx460", "sfx461", "sfx462", "sfx463", "sfx464", "sfx465", "sfx466", "sfx467", "sfx468", "sfx469", "sfx470", "sfx471", "sfx472", "sfx473", "sfx474", "sfx475", "sfx476", "sfx477", "sfx478", "sfx479", "sfx480", "sfx481", "sfx482", "sfx483", "sfx484", "sfx485", "sfx486", "sfx487", "sfx488", "sfx489", "sfx490", "sfx491", "sfx492", "sfx493", "sfx494", "sfx495", "sfx496", "sfx497", "sfx498", "sfx499", "sfx500", "sfx501", "sfx502", "sfx503", "sfx504", "sfx505", "sfx506", "sfx507", "sfx508", "sfx509", "sfx510", "sfx511", "sfx512", "sfx513", "sfx514", "sfx515", "sfx516", "sfx517", "sfx518", "sfx519", "sfx520", "sfx521", "sfx522", "sfx523", "sfx524", "sfx525", "sfx526", "sfx527", "sfx528", "sfx529", "sfx530", "sfx531", "sfx532", "sfx533", "sfx534", "sfx535", "sfx536", "sfx537", "sfx538", "sfx539", "sfx540", "sfx541", "sfx542", "sfx543", "sfx544", "sfx545", "sfx546", "sfx547", "sfx548", "sfx549", "sfx550", "sfx551", "sfx552", "sfx553", "sfx554", "sfx555", "sfx556", "sfx557", "sfx558", "sfx559", "sfx560", "sfx561", "sfx562", "sfx563", "sfx564", "sfx565", "sfx566", "sfx567", "sfx568", "sfx569", "sfx570", "sfx571", "sfx572", "sfx573", "sfx574", "sfx575", "sfx576", "sfx577", "sfx578", "sfx579", "sfx580", "sfx581", "sfx582", "sfx583", "sfx584", "sfx585", "sfx586", "sfx587", "sfx588", "sfx589", "sfx590", "sfx591", "sfx592", "sfx593", "sfx594", "sfx595", "sfx596", "sfx597", "sfx598", "sfx599", "sfx600", "sfx601", "sfx602", "sfx603", "sfx604", "sfx605", "sfx606", "sfx607", "sfx608", "sfx609", "sfx610", "sfx611", "sfx612", "sfx613", "sfx614", "sfx615", "sfx616", "sfx617", "sfx618", "sfx619", "sfx620", "sfx621", "sfx622", "sfx623", "sfx624", "sfx625", "sfx626", "sfx627", "sfx628", "sfx629", "sfx630", "sfx631", "sfx632", "sfx633", "sfx634", "sfx635", "sfx636", "sfx637", "sfx638", "sfx639", "sfx640", "sfx641", "sfx642", "sfx643", "sfx644", "sfx645", "sfx646", "sfx647", "sfx648", "sfx649", "sfx650", "sfx651", "sfx652", "sfx653", "sfx654", "sfx655", "sfx656", "sfx657", "sfx658", "sfx659", "sfx660", "sfx661", "sfx662", "sfx663", "sfx664", "sfx665", "sfx666", "sfx667", "sfx668", "sfx669", "sfx670", "sfx671", "sfx672", "sfx673", "sfx674", "sfx675", "sfx676", "sfx677", "sfx678", "sfx679", "sfx680", "sfx681", "sfx682", "sfx683", "sfx684", "sfx685", "sfx686", "sfx687", "sfx688", "sfx689", "sfx690", "sfx691", "sfx692", "sfx693", "sfx694", "sfx695", "sfx696", "sfx697", "sfx698", "sfx699", "sfx700", "sfx701", "sfx702", "sfx703", "sfx704", "sfx705", "sfx706", "sfx707", "sfx708", "sfx709", "sfx710", "sfx711", "sfx712", "sfx713", "sfx714", "sfx715", "sfx716", "sfx717", "sfx718", "sfx719", "sfx720", "sfx721", "sfx722", "sfx723", "sfx724", "sfx725", "sfx726", "sfx727", "sfx728", "sfx729", "sfx730", "sfx731", "sfx732", "sfx733", "sfx734", "sfx735", "sfx736", "sfx737", "sfx738", "sfx739", "sfx740", "sfx741", "sfx742", "sfx743", "sfx744", "sfx745", "sfx746", "sfx747", "sfx748", "sfx749", "sfx750", "sfx751", "sfx752", "sfx753", "sfx754", "sfx755", "sfx756", "sfx757", "sfx758", "sfx759", "sfx760", "sfx761", "sfx762", "sfx763", "sfx764", "sfx765", "sfx766", "sfx767", "sfx768", "sfx769", "sfx770", "sfx771", "sfx772", "sfx773", "sfx774", "sfx775", "sfx776", "sfx777", "sfx778", "sfx779", "sfx780", "sfx781", "sfx782", "sfx783", "sfx784", "sfx785", "sfx786", "sfx787", "sfx788", "sfx789", "sfx790", "sfx791", "sfx792", "sfx793", "sfx794", "sfx795", "sfx796", "sfx797", "sfx798", "sfx799", "sfx800", "sfx801", "sfx802", "sfx803", "sfx804", "sfx805", "sfx806", "sfx807", "sfx808", "sfx809", "sfx810", "sfx811", "sfx812", "sfx813", "sfx814", "sfx815", "sfx816", "sfx817", "sfx818", "sfx819", "sfx820", "sfx821", "sfx822", "sfx823", "sfx824", "sfx825", "sfx826", "sfx827", "sfx828", "sfx829", "sfx830", "sfx831", "sfx832", "sfx833", "sfx834", "sfx835", "sfx836", "sfx837", "sfx838", "sfx839", "sfx840", "sfx841", "sfx842", "sfx843", "sfx844", "sfx845", "sfx846", "sfx847", "sfx848", "sfx849", "sfx850", "sfx851", "sfx852", "sfx853", "sfx854", "sfx855", "sfx856", "sfx857", "sfx858", "sfx859", "sfx860", "sfx861", "sfx862", "sfx863", "sfx864", "sfx865", "sfx866", "sfx867", "sfx868", "sfx869", "sfx870", "sfx871", "sfx872", "sfx873", "sfx874", "sfx875", "sfx876", "sfx877", "sfx878", "sfx879", "sfx880", "sfx881", "sfx882", "sfx883", "sfx884", "sfx885", "sfx886", "sfx887", "sfx888", "sfx889", "sfx890", "sfx891", "sfx892", "sfx893", "sfx894", "sfx895", "sfx896", "sfx897", "sfx898", "sfx899", "sfx900", "sfx901", "sfx902", "sfx903", "sfx904", "sfx905", "sfx906", "sfx907", "sfx908", "sfx909", "sfx910", "sfx911", "sfx912", "sfx913", "sfx914", "sfx915", "sfx916", "sfx917", "sfx918", "sfx919", "sfx920", "sfx921", "sfx922", "sfx923", "sfx924", "sfx925", "sfx926", "sfx927", "sfx928", "sfx929", "sfx930", "sfx931", "sfx932", "sfx933", "sfx934", "sfx935", "sfx936", "sfx937", "sfx938", "sfx939", "sfx940", "sfx941", "sfx942", "sfx943", "sfx944", "sfx945", "sfx946", "sfx947", "sfx948", "sfx949", "sfx950", "sfx951", "sfx952", "sfx953", "sfx954", "sfx955", "sfx956", "sfx957", "sfx958", "sfx959", "sfx960", "sfx961", "sfx962", "sfx963", "sfx964", "sfx965", "sfx966", "sfx967", "sfx968", "sfx969", "sfx970", "sfx971", "sfx972", "sfx973", "sfx974", "sfx975", "sfx976", "sfx977", "sfx978", "sfx979", "sfx980", "sfx981", "sfx982", "sfx983", "sfx984", "sfx985", "sfx986", "sfx987", "sfx988", "sfx989", "sfx990", "sfx991", "sfx992", "sfx993", "sfx994", "sfx995", "sfx996", "sfx997", "sfx998", "sfx999", 
            "bgm0", "bgm1", "bgm2", "bgm3", "bgm4", "bgm5", "bgm6", "bgm7", "bgm8", "bgm9", "bgm10", "bgm11", "bgm12", "bgm13", "bgm14", "bgm15", "bgm16", "bgm17", "bgm18", "bgm19", "bgm20", "bgm21", "bgm22", "bgm23", "bgm24", "bgm25", "bgm26", "bgm27", "bgm28", "bgm29", "bgm30", "bgm31", "bgm32", "bgm33", "bgm34", "bgm35", "bgm36", "bgm37", "bgm38", "bgm39", "bgm40", "bgm41", "bgm42", "bgm43", "bgm44", "bgm45", "bgm46", "bgm47", "bgm48", "bgm49", "bgm50", "bgm51", "bgm52", "bgm53", "bgm54", "bgm55", "bgm56", "bgm57", "bgm58", "bgm59", "bgm60", "bgm61", "bgm62", "bgm63", "bgm64", "bgm65", "bgm66", "bgm67", "bgm68", "bgm69", "bgm70", "bgm71", "bgm72", "bgm73", "bgm74", "bgm75", "bgm76", "bgm77", "bgm78", "bgm79", "bgm80", "bgm81", "bgm82", "bgm83", "bgm84", "bgm85", "bgm86", "bgm87", "bgm88", "bgm89", "bgm90", "bgm91", "bgm92", "bgm93", "bgm94", "bgm95", "bgm96", "bgm97", "bgm98", "bgm99", "bgm100", "bgm101", "bgm102", "bgm103", "bgm104", "bgm105", "bgm106", "bgm107", "bgm108", "bgm109", "bgm110", "bgm111", "bgm112", "bgm113", "bgm114", "bgm115", "bgm116", "bgm117", "bgm118", "bgm119", "bgm120", "bgm121", "bgm122", "bgm123", "bgm124", "bgm125", "bgm126", "bgm127", "bgm128", "bgm129", "bgm130", "bgm131", "bgm132", "bgm133", "bgm134", "bgm135", "bgm136", "bgm137", "bgm138", "bgm139", "bgm140", "bgm141", "bgm142", "bgm143", "bgm144", "bgm145", "bgm146", "bgm147", "bgm148", "bgm149", "bgm150", "bgm151", "bgm152", "bgm153", "bgm154", "bgm155", "bgm156", "bgm157", "bgm158", "bgm159", "bgm160", "bgm161", "bgm162", "bgm163", "bgm164", "bgm165", "bgm166", "bgm167", "bgm168", "bgm169", "bgm170", "bgm171", "bgm172", "bgm173", "bgm174", "bgm175", "bgm176", "bgm177", "bgm178", "bgm179", "bgm180", "bgm181", "bgm182", "bgm183", "bgm184", "bgm185", "bgm186", "bgm187", "bgm188", "bgm189", "bgm190", "bgm191", "bgm192", "bgm193", "bgm194", "bgm195", "bgm196", "bgm197", "bgm198", "bgm199", "bgm200", "bgm201", "bgm202", "bgm203", "bgm204", "bgm205", "bgm206", "bgm207", "bgm208", "bgm209", "bgm210", "bgm211", "bgm212", "bgm213", "bgm214", "bgm215", "bgm216", "bgm217", "bgm218", "bgm219", "bgm220", "bgm221", "bgm222", "bgm223", "bgm224", "bgm225", "bgm226", "bgm227", "bgm228", "bgm229", "bgm230", "bgm231", "bgm232", "bgm233", "bgm234", "bgm235", "bgm236", "bgm237", "bgm238", "bgm239", "bgm240", "bgm241", "bgm242", "bgm243", "bgm244", "bgm245", "bgm246", "bgm247", "bgm248", "bgm249", "bgm250", "bgm251", "bgm252", "bgm253", "bgm254", "bgm255", "bgm256", "bgm257", "bgm258", "bgm259", "bgm260", "bgm261", "bgm262", "bgm263", "bgm264", "bgm265", "bgm266", "bgm267", "bgm268", "bgm269", "bgm270", "bgm271", "bgm272", "bgm273", "bgm274", "bgm275", "bgm276", "bgm277", "bgm278", "bgm279", "bgm280", "bgm281", "bgm282", "bgm283", "bgm284", "bgm285", "bgm286", "bgm287", "bgm288", "bgm289", "bgm290", "bgm291", "bgm292", "bgm293", "bgm294", "bgm295", "bgm296", "bgm297", "bgm298", "bgm299", "bgm300", "bgm301", "bgm302", "bgm303", "bgm304", "bgm305", "bgm306", "bgm307", "bgm308", "bgm309", "bgm310", "bgm311", "bgm312", "bgm313", "bgm314", "bgm315", "bgm316", "bgm317", "bgm318", "bgm319", "bgm320", "bgm321", "bgm322", "bgm323", "bgm324", "bgm325", "bgm326", "bgm327", "bgm328", "bgm329", "bgm330", "bgm331", "bgm332", "bgm333", "bgm334", "bgm335", "bgm336", "bgm337", "bgm338", "bgm339", "bgm340", "bgm341", "bgm342", "bgm343", "bgm344", "bgm345", "bgm346", "bgm347", "bgm348", "bgm349", "bgm350", "bgm351", "bgm352", "bgm353", "bgm354", "bgm355", "bgm356", "bgm357", "bgm358", "bgm359", "bgm360", "bgm361", "bgm362", "bgm363", "bgm364", "bgm365", "bgm366", "bgm367", "bgm368", "bgm369", "bgm370", "bgm371", "bgm372", "bgm373", "bgm374", "bgm375", "bgm376", "bgm377", "bgm378", "bgm379", "bgm380", "bgm381", "bgm382", "bgm383", "bgm384", "bgm385", "bgm386", "bgm387", "bgm388", "bgm389", "bgm390", "bgm391", "bgm392", "bgm393", "bgm394", "bgm395", "bgm396", "bgm397", "bgm398", "bgm399", "bgm400", "bgm401", "bgm402", "bgm403", "bgm404", "bgm405", "bgm406", "bgm407", "bgm408", "bgm409", "bgm410", "bgm411", "bgm412", "bgm413", "bgm414", "bgm415", "bgm416", "bgm417", "bgm418", "bgm419", "bgm420", "bgm421", "bgm422", "bgm423", "bgm424", "bgm425", "bgm426", "bgm427", "bgm428", "bgm429", "bgm430", "bgm431", "bgm432", "bgm433", "bgm434", "bgm435", "bgm436", "bgm437", "bgm438", "bgm439", "bgm440", "bgm441", "bgm442", "bgm443", "bgm444", "bgm445", "bgm446", "bgm447", "bgm448", "bgm449", "bgm450", "bgm451", "bgm452", "bgm453", "bgm454", "bgm455", "bgm456", "bgm457", "bgm458", "bgm459", "bgm460", "bgm461", "bgm462", "bgm463", "bgm464", "bgm465", "bgm466", "bgm467", "bgm468", "bgm469", "bgm470", "bgm471", "bgm472", "bgm473", "bgm474", "bgm475", "bgm476", "bgm477", "bgm478", "bgm479", "bgm480", "bgm481", "bgm482", "bgm483", "bgm484", "bgm485", "bgm486", "bgm487", "bgm488", "bgm489", "bgm490", "bgm491", "bgm492", "bgm493", "bgm494", "bgm495", "bgm496", "bgm497", "bgm498", "bgm499", "bgm500", "bgm501", "bgm502", "bgm503", "bgm504", "bgm505", "bgm506", "bgm507", "bgm508", "bgm509", "bgm510", "bgm511", "bgm512", "bgm513", "bgm514", "bgm515", "bgm516", "bgm517", "bgm518", "bgm519", "bgm520", "bgm521", "bgm522", "bgm523", "bgm524", "bgm525", "bgm526", "bgm527", "bgm528", "bgm529", "bgm530", "bgm531", "bgm532", "bgm533", "bgm534", "bgm535", "bgm536", "bgm537", "bgm538", "bgm539", "bgm540", "bgm541", "bgm542", "bgm543", "bgm544", "bgm545", "bgm546", "bgm547", "bgm548", "bgm549", "bgm550", "bgm551", "bgm552", "bgm553", "bgm554", "bgm555", "bgm556", "bgm557", "bgm558", "bgm559", "bgm560", "bgm561", "bgm562", "bgm563", "bgm564", "bgm565", "bgm566", "bgm567", "bgm568", "bgm569", "bgm570", "bgm571", "bgm572", "bgm573", "bgm574", "bgm575", "bgm576", "bgm577", "bgm578", "bgm579", "bgm580", "bgm581", "bgm582", "bgm583", "bgm584", "bgm585", "bgm586", "bgm587", "bgm588", "bgm589", "bgm590", "bgm591", "bgm592", "bgm593", "bgm594", "bgm595", "bgm596", "bgm597", "bgm598", "bgm599", "bgm600", "bgm601", "bgm602", "bgm603", "bgm604", "bgm605", "bgm606", "bgm607", "bgm608", "bgm609", "bgm610", "bgm611", "bgm612", "bgm613", "bgm614", "bgm615", "bgm616", "bgm617", "bgm618", "bgm619", "bgm620", "bgm621", "bgm622", "bgm623", "bgm624", "bgm625", "bgm626", "bgm627", "bgm628", "bgm629", "bgm630", "bgm631", "bgm632", "bgm633", "bgm634", "bgm635", "bgm636", "bgm637", "bgm638", "bgm639", "bgm640", "bgm641", "bgm642", "bgm643", "bgm644", "bgm645", "bgm646", "bgm647", "bgm648", "bgm649", "bgm650", "bgm651", "bgm652", "bgm653", "bgm654", "bgm655", "bgm656", "bgm657", "bgm658", "bgm659", "bgm660", "bgm661", "bgm662", "bgm663", "bgm664", "bgm665", "bgm666", "bgm667", "bgm668", "bgm669", "bgm670", "bgm671", "bgm672", "bgm673", "bgm674", "bgm675", "bgm676", "bgm677", "bgm678", "bgm679", "bgm680", "bgm681", "bgm682", "bgm683", "bgm684", "bgm685", "bgm686", "bgm687", "bgm688", "bgm689", "bgm690", "bgm691", "bgm692", "bgm693", "bgm694", "bgm695", "bgm696", "bgm697", "bgm698", "bgm699", "bgm700", "bgm701", "bgm702", "bgm703", "bgm704", "bgm705", "bgm706", "bgm707", "bgm708", "bgm709", "bgm710", "bgm711", "bgm712", "bgm713", "bgm714", "bgm715", "bgm716", "bgm717", "bgm718", "bgm719", "bgm720", "bgm721", "bgm722", "bgm723", "bgm724", "bgm725", "bgm726", "bgm727", "bgm728", "bgm729", "bgm730", "bgm731", "bgm732", "bgm733", "bgm734", "bgm735", "bgm736", "bgm737", "bgm738", "bgm739", "bgm740", "bgm741", "bgm742", "bgm743", "bgm744", "bgm745", "bgm746", "bgm747", "bgm748", "bgm749", "bgm750", "bgm751", "bgm752", "bgm753", "bgm754", "bgm755", "bgm756", "bgm757", "bgm758", "bgm759", "bgm760", "bgm761", "bgm762", "bgm763", "bgm764", "bgm765", "bgm766", "bgm767", "bgm768", "bgm769", "bgm770", "bgm771", "bgm772", "bgm773", "bgm774", "bgm775", "bgm776", "bgm777", "bgm778", "bgm779", "bgm780", "bgm781", "bgm782", "bgm783", "bgm784", "bgm785", "bgm786", "bgm787", "bgm788", "bgm789", "bgm790", "bgm791", "bgm792", "bgm793", "bgm794", "bgm795", "bgm796", "bgm797", "bgm798", "bgm799", "bgm800", "bgm801", "bgm802", "bgm803", "bgm804", "bgm805", "bgm806", "bgm807", "bgm808", "bgm809", "bgm810", "bgm811", "bgm812", "bgm813", "bgm814", "bgm815", "bgm816", "bgm817", "bgm818", "bgm819", "bgm820", "bgm821", "bgm822", "bgm823", "bgm824", "bgm825", "bgm826", "bgm827", "bgm828", "bgm829", "bgm830", "bgm831", "bgm832", "bgm833", "bgm834", "bgm835", "bgm836", "bgm837", "bgm838", "bgm839", "bgm840", "bgm841", "bgm842", "bgm843", "bgm844", "bgm845", "bgm846", "bgm847", "bgm848", "bgm849", "bgm850", "bgm851", "bgm852", "bgm853", "bgm854", "bgm855", "bgm856", "bgm857", "bgm858", "bgm859", "bgm860", "bgm861", "bgm862", "bgm863", "bgm864", "bgm865", "bgm866", "bgm867", "bgm868", "bgm869", "bgm870", "bgm871", "bgm872", "bgm873", "bgm874", "bgm875", "bgm876", "bgm877", "bgm878", "bgm879", "bgm880", "bgm881", "bgm882", "bgm883", "bgm884", "bgm885", "bgm886", "bgm887", "bgm888", "bgm889", "bgm890", "bgm891", "bgm892", "bgm893", "bgm894", "bgm895", "bgm896", "bgm897", "bgm898", "bgm899", "bgm900", "bgm901", "bgm902", "bgm903", "bgm904", "bgm905", "bgm906", "bgm907", "bgm908", "bgm909", "bgm910", "bgm911", "bgm912", "bgm913", "bgm914", "bgm915", "bgm916", "bgm917", "bgm918", "bgm919", "bgm920", "bgm921", "bgm922", "bgm923", "bgm924", "bgm925", "bgm926", "bgm927", "bgm928", "bgm929", "bgm930", "bgm931", "bgm932", "bgm933", "bgm934", "bgm935", "bgm936", "bgm937", "bgm938", "bgm939", "bgm940", "bgm941", "bgm942", "bgm943", "bgm944", "bgm945", "bgm946", "bgm947", "bgm948", "bgm949", "bgm950", "bgm951", "bgm952", "bgm953", "bgm954", "bgm955", "bgm956", "bgm957", "bgm958", "bgm959", "bgm960", "bgm961", "bgm962", "bgm963", "bgm964", "bgm965", "bgm966", "bgm967", "bgm968", "bgm969", "bgm970", "bgm971", "bgm972", "bgm973", "bgm974", "bgm975", "bgm976", "bgm977", "bgm978", "bgm979", "bgm980", "bgm981", "bgm982", "bgm983", "bgm984", "bgm985", "bgm986", "bgm987", "bgm988", "bgm989", "bgm990", "bgm991", "bgm992", "bgm993", "bgm994", "bgm995", "bgm996", "bgm997", "bgm998", "bgm999",
            "cancel", "checkpoint", "restart", "win", "message", "again", "stopmusic"];

        var CARDINAL_DIRECTION_WORDS = [
            "DIRECTION",
            "up","down","left","right","horizontal","vertical"]

        var RULE_DIRECTION_WORDS = [
            "DIRECTION",//tag
            "up", "down", "left", "right", "random", "horizontal", "vertical","late","rigid"]

        var LOOP_WORDS = [
            "BRACKET",//tag
            "startloop","endloop"]
            
        var PATTERN_DIRECTION_WORDS = [
            "DIRECTION",
            "up", "down", "left", "right", "moving", "stationary", "no", "randomdir", "random", "horizontal", "vertical", "orthogonal", "perpendicular", "parallel", "action"]


        var SOUND_EVENTS = [
            "SOUNDEVENT",
            "undo", "restart", "titlescreen", "startgame", "cancel", "endgame", "startlevel", "endlevel", "showmessage", "closemessage", 
            "sfx0", "sfx1", "sfx2", "sfx3", "sfx4", "sfx5", "sfx6", "sfx7", "sfx8", "sfx9", "sfx10", "sfx11", "sfx12", "sfx13", "sfx14", "sfx15", "sfx16", "sfx17", "sfx18", "sfx19", "sfx20", "sfx21", "sfx22", "sfx23", "sfx24", "sfx25", "sfx26", "sfx27", "sfx28", "sfx29", "sfx30", "sfx31", "sfx32", "sfx33", "sfx34", "sfx35", "sfx36", "sfx37", "sfx38", "sfx39", "sfx40", "sfx41", "sfx42", "sfx43", "sfx44", "sfx45", "sfx46", "sfx47", "sfx48", "sfx49", "sfx50", "sfx51", "sfx52", "sfx53", "sfx54", "sfx55", "sfx56", "sfx57", "sfx58", "sfx59", "sfx60", "sfx61", "sfx62", "sfx63", "sfx64", "sfx65", "sfx66", "sfx67", "sfx68", "sfx69", "sfx70", "sfx71", "sfx72", "sfx73", "sfx74", "sfx75", "sfx76", "sfx77", "sfx78", "sfx79", "sfx80", "sfx81", "sfx82", "sfx83", "sfx84", "sfx85", "sfx86", "sfx87", "sfx88", "sfx89", "sfx90", "sfx91", "sfx92", "sfx93", "sfx94", "sfx95", "sfx96", "sfx97", "sfx98", "sfx99", "sfx100", "sfx101", "sfx102", "sfx103", "sfx104", "sfx105", "sfx106", "sfx107", "sfx108", "sfx109", "sfx110", "sfx111", "sfx112", "sfx113", "sfx114", "sfx115", "sfx116", "sfx117", "sfx118", "sfx119", "sfx120", "sfx121", "sfx122", "sfx123", "sfx124", "sfx125", "sfx126", "sfx127", "sfx128", "sfx129", "sfx130", "sfx131", "sfx132", "sfx133", "sfx134", "sfx135", "sfx136", "sfx137", "sfx138", "sfx139", "sfx140", "sfx141", "sfx142", "sfx143", "sfx144", "sfx145", "sfx146", "sfx147", "sfx148", "sfx149", "sfx150", "sfx151", "sfx152", "sfx153", "sfx154", "sfx155", "sfx156", "sfx157", "sfx158", "sfx159", "sfx160", "sfx161", "sfx162", "sfx163", "sfx164", "sfx165", "sfx166", "sfx167", "sfx168", "sfx169", "sfx170", "sfx171", "sfx172", "sfx173", "sfx174", "sfx175", "sfx176", "sfx177", "sfx178", "sfx179", "sfx180", "sfx181", "sfx182", "sfx183", "sfx184", "sfx185", "sfx186", "sfx187", "sfx188", "sfx189", "sfx190", "sfx191", "sfx192", "sfx193", "sfx194", "sfx195", "sfx196", "sfx197", "sfx198", "sfx199", "sfx200", "sfx201", "sfx202", "sfx203", "sfx204", "sfx205", "sfx206", "sfx207", "sfx208", "sfx209", "sfx210", "sfx211", "sfx212", "sfx213", "sfx214", "sfx215", "sfx216", "sfx217", "sfx218", "sfx219", "sfx220", "sfx221", "sfx222", "sfx223", "sfx224", "sfx225", "sfx226", "sfx227", "sfx228", "sfx229", "sfx230", "sfx231", "sfx232", "sfx233", "sfx234", "sfx235", "sfx236", "sfx237", "sfx238", "sfx239", "sfx240", "sfx241", "sfx242", "sfx243", "sfx244", "sfx245", "sfx246", "sfx247", "sfx248", "sfx249", "sfx250", "sfx251", "sfx252", "sfx253", "sfx254", "sfx255", "sfx256", "sfx257", "sfx258", "sfx259", "sfx260", "sfx261", "sfx262", "sfx263", "sfx264", "sfx265", "sfx266", "sfx267", "sfx268", "sfx269", "sfx270", "sfx271", "sfx272", "sfx273", "sfx274", "sfx275", "sfx276", "sfx277", "sfx278", "sfx279", "sfx280", "sfx281", "sfx282", "sfx283", "sfx284", "sfx285", "sfx286", "sfx287", "sfx288", "sfx289", "sfx290", "sfx291", "sfx292", "sfx293", "sfx294", "sfx295", "sfx296", "sfx297", "sfx298", "sfx299", "sfx300", "sfx301", "sfx302", "sfx303", "sfx304", "sfx305", "sfx306", "sfx307", "sfx308", "sfx309", "sfx310", "sfx311", "sfx312", "sfx313", "sfx314", "sfx315", "sfx316", "sfx317", "sfx318", "sfx319", "sfx320", "sfx321", "sfx322", "sfx323", "sfx324", "sfx325", "sfx326", "sfx327", "sfx328", "sfx329", "sfx330", "sfx331", "sfx332", "sfx333", "sfx334", "sfx335", "sfx336", "sfx337", "sfx338", "sfx339", "sfx340", "sfx341", "sfx342", "sfx343", "sfx344", "sfx345", "sfx346", "sfx347", "sfx348", "sfx349", "sfx350", "sfx351", "sfx352", "sfx353", "sfx354", "sfx355", "sfx356", "sfx357", "sfx358", "sfx359", "sfx360", "sfx361", "sfx362", "sfx363", "sfx364", "sfx365", "sfx366", "sfx367", "sfx368", "sfx369", "sfx370", "sfx371", "sfx372", "sfx373", "sfx374", "sfx375", "sfx376", "sfx377", "sfx378", "sfx379", "sfx380", "sfx381", "sfx382", "sfx383", "sfx384", "sfx385", "sfx386", "sfx387", "sfx388", "sfx389", "sfx390", "sfx391", "sfx392", "sfx393", "sfx394", "sfx395", "sfx396", "sfx397", "sfx398", "sfx399", "sfx400", "sfx401", "sfx402", "sfx403", "sfx404", "sfx405", "sfx406", "sfx407", "sfx408", "sfx409", "sfx410", "sfx411", "sfx412", "sfx413", "sfx414", "sfx415", "sfx416", "sfx417", "sfx418", "sfx419", "sfx420", "sfx421", "sfx422", "sfx423", "sfx424", "sfx425", "sfx426", "sfx427", "sfx428", "sfx429", "sfx430", "sfx431", "sfx432", "sfx433", "sfx434", "sfx435", "sfx436", "sfx437", "sfx438", "sfx439", "sfx440", "sfx441", "sfx442", "sfx443", "sfx444", "sfx445", "sfx446", "sfx447", "sfx448", "sfx449", "sfx450", "sfx451", "sfx452", "sfx453", "sfx454", "sfx455", "sfx456", "sfx457", "sfx458", "sfx459", "sfx460", "sfx461", "sfx462", "sfx463", "sfx464", "sfx465", "sfx466", "sfx467", "sfx468", "sfx469", "sfx470", "sfx471", "sfx472", "sfx473", "sfx474", "sfx475", "sfx476", "sfx477", "sfx478", "sfx479", "sfx480", "sfx481", "sfx482", "sfx483", "sfx484", "sfx485", "sfx486", "sfx487", "sfx488", "sfx489", "sfx490", "sfx491", "sfx492", "sfx493", "sfx494", "sfx495", "sfx496", "sfx497", "sfx498", "sfx499", "sfx500", "sfx501", "sfx502", "sfx503", "sfx504", "sfx505", "sfx506", "sfx507", "sfx508", "sfx509", "sfx510", "sfx511", "sfx512", "sfx513", "sfx514", "sfx515", "sfx516", "sfx517", "sfx518", "sfx519", "sfx520", "sfx521", "sfx522", "sfx523", "sfx524", "sfx525", "sfx526", "sfx527", "sfx528", "sfx529", "sfx530", "sfx531", "sfx532", "sfx533", "sfx534", "sfx535", "sfx536", "sfx537", "sfx538", "sfx539", "sfx540", "sfx541", "sfx542", "sfx543", "sfx544", "sfx545", "sfx546", "sfx547", "sfx548", "sfx549", "sfx550", "sfx551", "sfx552", "sfx553", "sfx554", "sfx555", "sfx556", "sfx557", "sfx558", "sfx559", "sfx560", "sfx561", "sfx562", "sfx563", "sfx564", "sfx565", "sfx566", "sfx567", "sfx568", "sfx569", "sfx570", "sfx571", "sfx572", "sfx573", "sfx574", "sfx575", "sfx576", "sfx577", "sfx578", "sfx579", "sfx580", "sfx581", "sfx582", "sfx583", "sfx584", "sfx585", "sfx586", "sfx587", "sfx588", "sfx589", "sfx590", "sfx591", "sfx592", "sfx593", "sfx594", "sfx595", "sfx596", "sfx597", "sfx598", "sfx599", "sfx600", "sfx601", "sfx602", "sfx603", "sfx604", "sfx605", "sfx606", "sfx607", "sfx608", "sfx609", "sfx610", "sfx611", "sfx612", "sfx613", "sfx614", "sfx615", "sfx616", "sfx617", "sfx618", "sfx619", "sfx620", "sfx621", "sfx622", "sfx623", "sfx624", "sfx625", "sfx626", "sfx627", "sfx628", "sfx629", "sfx630", "sfx631", "sfx632", "sfx633", "sfx634", "sfx635", "sfx636", "sfx637", "sfx638", "sfx639", "sfx640", "sfx641", "sfx642", "sfx643", "sfx644", "sfx645", "sfx646", "sfx647", "sfx648", "sfx649", "sfx650", "sfx651", "sfx652", "sfx653", "sfx654", "sfx655", "sfx656", "sfx657", "sfx658", "sfx659", "sfx660", "sfx661", "sfx662", "sfx663", "sfx664", "sfx665", "sfx666", "sfx667", "sfx668", "sfx669", "sfx670", "sfx671", "sfx672", "sfx673", "sfx674", "sfx675", "sfx676", "sfx677", "sfx678", "sfx679", "sfx680", "sfx681", "sfx682", "sfx683", "sfx684", "sfx685", "sfx686", "sfx687", "sfx688", "sfx689", "sfx690", "sfx691", "sfx692", "sfx693", "sfx694", "sfx695", "sfx696", "sfx697", "sfx698", "sfx699", "sfx700", "sfx701", "sfx702", "sfx703", "sfx704", "sfx705", "sfx706", "sfx707", "sfx708", "sfx709", "sfx710", "sfx711", "sfx712", "sfx713", "sfx714", "sfx715", "sfx716", "sfx717", "sfx718", "sfx719", "sfx720", "sfx721", "sfx722", "sfx723", "sfx724", "sfx725", "sfx726", "sfx727", "sfx728", "sfx729", "sfx730", "sfx731", "sfx732", "sfx733", "sfx734", "sfx735", "sfx736", "sfx737", "sfx738", "sfx739", "sfx740", "sfx741", "sfx742", "sfx743", "sfx744", "sfx745", "sfx746", "sfx747", "sfx748", "sfx749", "sfx750", "sfx751", "sfx752", "sfx753", "sfx754", "sfx755", "sfx756", "sfx757", "sfx758", "sfx759", "sfx760", "sfx761", "sfx762", "sfx763", "sfx764", "sfx765", "sfx766", "sfx767", "sfx768", "sfx769", "sfx770", "sfx771", "sfx772", "sfx773", "sfx774", "sfx775", "sfx776", "sfx777", "sfx778", "sfx779", "sfx780", "sfx781", "sfx782", "sfx783", "sfx784", "sfx785", "sfx786", "sfx787", "sfx788", "sfx789", "sfx790", "sfx791", "sfx792", "sfx793", "sfx794", "sfx795", "sfx796", "sfx797", "sfx798", "sfx799", "sfx800", "sfx801", "sfx802", "sfx803", "sfx804", "sfx805", "sfx806", "sfx807", "sfx808", "sfx809", "sfx810", "sfx811", "sfx812", "sfx813", "sfx814", "sfx815", "sfx816", "sfx817", "sfx818", "sfx819", "sfx820", "sfx821", "sfx822", "sfx823", "sfx824", "sfx825", "sfx826", "sfx827", "sfx828", "sfx829", "sfx830", "sfx831", "sfx832", "sfx833", "sfx834", "sfx835", "sfx836", "sfx837", "sfx838", "sfx839", "sfx840", "sfx841", "sfx842", "sfx843", "sfx844", "sfx845", "sfx846", "sfx847", "sfx848", "sfx849", "sfx850", "sfx851", "sfx852", "sfx853", "sfx854", "sfx855", "sfx856", "sfx857", "sfx858", "sfx859", "sfx860", "sfx861", "sfx862", "sfx863", "sfx864", "sfx865", "sfx866", "sfx867", "sfx868", "sfx869", "sfx870", "sfx871", "sfx872", "sfx873", "sfx874", "sfx875", "sfx876", "sfx877", "sfx878", "sfx879", "sfx880", "sfx881", "sfx882", "sfx883", "sfx884", "sfx885", "sfx886", "sfx887", "sfx888", "sfx889", "sfx890", "sfx891", "sfx892", "sfx893", "sfx894", "sfx895", "sfx896", "sfx897", "sfx898", "sfx899", "sfx900", "sfx901", "sfx902", "sfx903", "sfx904", "sfx905", "sfx906", "sfx907", "sfx908", "sfx909", "sfx910", "sfx911", "sfx912", "sfx913", "sfx914", "sfx915", "sfx916", "sfx917", "sfx918", "sfx919", "sfx920", "sfx921", "sfx922", "sfx923", "sfx924", "sfx925", "sfx926", "sfx927", "sfx928", "sfx929", "sfx930", "sfx931", "sfx932", "sfx933", "sfx934", "sfx935", "sfx936", "sfx937", "sfx938", "sfx939", "sfx940", "sfx941", "sfx942", "sfx943", "sfx944", "sfx945", "sfx946", "sfx947", "sfx948", "sfx949", "sfx950", "sfx951", "sfx952", "sfx953", "sfx954", "sfx955", "sfx956", "sfx957", "sfx958", "sfx959", "sfx960", "sfx961", "sfx962", "sfx963", "sfx964", "sfx965", "sfx966", "sfx967", "sfx968", "sfx969", "sfx970", "sfx971", "sfx972", "sfx973", "sfx974", "sfx975", "sfx976", "sfx977", "sfx978", "sfx979", "sfx980", "sfx981", "sfx982", "sfx983", "sfx984", "sfx985", "sfx986", "sfx987", "sfx988", "sfx989", "sfx990", "sfx991", "sfx992", "sfx993", "sfx994", "sfx995", "sfx996", "sfx997", "sfx998", "sfx999"
        ];

        var SOUND_VERBS = [
            "SOUNDVERB",
            "move", "action", "create", "destroy", "cantmove"
        ];

        var SOUND_DIRECTIONS = [
            "DIRECTION",
            "up","down","left","right","horizontal","vertical","orthogonal"]

        var MUSIC_EVENTS = [
            "MUSICEVENT",
            "undo", "restart", "titlescreen", "startgame", "cancel", "endgame", "startlevel", "endlevel", "showmessage", "closemessage", 
            "bgm0", "bgm1", "bgm2", "bgm3", "bgm4", "bgm5", "bgm6", "bgm7", "bgm8", "bgm9", "bgm10", "bgm11", "bgm12", "bgm13", "bgm14", "bgm15", "bgm16", "bgm17", "bgm18", "bgm19", "bgm20", "bgm21", "bgm22", "bgm23", "bgm24", "bgm25", "bgm26", "bgm27", "bgm28", "bgm29", "bgm30", "bgm31", "bgm32", "bgm33", "bgm34", "bgm35", "bgm36", "bgm37", "bgm38", "bgm39", "bgm40", "bgm41", "bgm42", "bgm43", "bgm44", "bgm45", "bgm46", "bgm47", "bgm48", "bgm49", "bgm50", "bgm51", "bgm52", "bgm53", "bgm54", "bgm55", "bgm56", "bgm57", "bgm58", "bgm59", "bgm60", "bgm61", "bgm62", "bgm63", "bgm64", "bgm65", "bgm66", "bgm67", "bgm68", "bgm69", "bgm70", "bgm71", "bgm72", "bgm73", "bgm74", "bgm75", "bgm76", "bgm77", "bgm78", "bgm79", "bgm80", "bgm81", "bgm82", "bgm83", "bgm84", "bgm85", "bgm86", "bgm87", "bgm88", "bgm89", "bgm90", "bgm91", "bgm92", "bgm93", "bgm94", "bgm95", "bgm96", "bgm97", "bgm98", "bgm99", "bgm100", "bgm101", "bgm102", "bgm103", "bgm104", "bgm105", "bgm106", "bgm107", "bgm108", "bgm109", "bgm110", "bgm111", "bgm112", "bgm113", "bgm114", "bgm115", "bgm116", "bgm117", "bgm118", "bgm119", "bgm120", "bgm121", "bgm122", "bgm123", "bgm124", "bgm125", "bgm126", "bgm127", "bgm128", "bgm129", "bgm130", "bgm131", "bgm132", "bgm133", "bgm134", "bgm135", "bgm136", "bgm137", "bgm138", "bgm139", "bgm140", "bgm141", "bgm142", "bgm143", "bgm144", "bgm145", "bgm146", "bgm147", "bgm148", "bgm149", "bgm150", "bgm151", "bgm152", "bgm153", "bgm154", "bgm155", "bgm156", "bgm157", "bgm158", "bgm159", "bgm160", "bgm161", "bgm162", "bgm163", "bgm164", "bgm165", "bgm166", "bgm167", "bgm168", "bgm169", "bgm170", "bgm171", "bgm172", "bgm173", "bgm174", "bgm175", "bgm176", "bgm177", "bgm178", "bgm179", "bgm180", "bgm181", "bgm182", "bgm183", "bgm184", "bgm185", "bgm186", "bgm187", "bgm188", "bgm189", "bgm190", "bgm191", "bgm192", "bgm193", "bgm194", "bgm195", "bgm196", "bgm197", "bgm198", "bgm199", "bgm200", "bgm201", "bgm202", "bgm203", "bgm204", "bgm205", "bgm206", "bgm207", "bgm208", "bgm209", "bgm210", "bgm211", "bgm212", "bgm213", "bgm214", "bgm215", "bgm216", "bgm217", "bgm218", "bgm219", "bgm220", "bgm221", "bgm222", "bgm223", "bgm224", "bgm225", "bgm226", "bgm227", "bgm228", "bgm229", "bgm230", "bgm231", "bgm232", "bgm233", "bgm234", "bgm235", "bgm236", "bgm237", "bgm238", "bgm239", "bgm240", "bgm241", "bgm242", "bgm243", "bgm244", "bgm245", "bgm246", "bgm247", "bgm248", "bgm249", "bgm250", "bgm251", "bgm252", "bgm253", "bgm254", "bgm255", "bgm256", "bgm257", "bgm258", "bgm259", "bgm260", "bgm261", "bgm262", "bgm263", "bgm264", "bgm265", "bgm266", "bgm267", "bgm268", "bgm269", "bgm270", "bgm271", "bgm272", "bgm273", "bgm274", "bgm275", "bgm276", "bgm277", "bgm278", "bgm279", "bgm280", "bgm281", "bgm282", "bgm283", "bgm284", "bgm285", "bgm286", "bgm287", "bgm288", "bgm289", "bgm290", "bgm291", "bgm292", "bgm293", "bgm294", "bgm295", "bgm296", "bgm297", "bgm298", "bgm299", "bgm300", "bgm301", "bgm302", "bgm303", "bgm304", "bgm305", "bgm306", "bgm307", "bgm308", "bgm309", "bgm310", "bgm311", "bgm312", "bgm313", "bgm314", "bgm315", "bgm316", "bgm317", "bgm318", "bgm319", "bgm320", "bgm321", "bgm322", "bgm323", "bgm324", "bgm325", "bgm326", "bgm327", "bgm328", "bgm329", "bgm330", "bgm331", "bgm332", "bgm333", "bgm334", "bgm335", "bgm336", "bgm337", "bgm338", "bgm339", "bgm340", "bgm341", "bgm342", "bgm343", "bgm344", "bgm345", "bgm346", "bgm347", "bgm348", "bgm349", "bgm350", "bgm351", "bgm352", "bgm353", "bgm354", "bgm355", "bgm356", "bgm357", "bgm358", "bgm359", "bgm360", "bgm361", "bgm362", "bgm363", "bgm364", "bgm365", "bgm366", "bgm367", "bgm368", "bgm369", "bgm370", "bgm371", "bgm372", "bgm373", "bgm374", "bgm375", "bgm376", "bgm377", "bgm378", "bgm379", "bgm380", "bgm381", "bgm382", "bgm383", "bgm384", "bgm385", "bgm386", "bgm387", "bgm388", "bgm389", "bgm390", "bgm391", "bgm392", "bgm393", "bgm394", "bgm395", "bgm396", "bgm397", "bgm398", "bgm399", "bgm400", "bgm401", "bgm402", "bgm403", "bgm404", "bgm405", "bgm406", "bgm407", "bgm408", "bgm409", "bgm410", "bgm411", "bgm412", "bgm413", "bgm414", "bgm415", "bgm416", "bgm417", "bgm418", "bgm419", "bgm420", "bgm421", "bgm422", "bgm423", "bgm424", "bgm425", "bgm426", "bgm427", "bgm428", "bgm429", "bgm430", "bgm431", "bgm432", "bgm433", "bgm434", "bgm435", "bgm436", "bgm437", "bgm438", "bgm439", "bgm440", "bgm441", "bgm442", "bgm443", "bgm444", "bgm445", "bgm446", "bgm447", "bgm448", "bgm449", "bgm450", "bgm451", "bgm452", "bgm453", "bgm454", "bgm455", "bgm456", "bgm457", "bgm458", "bgm459", "bgm460", "bgm461", "bgm462", "bgm463", "bgm464", "bgm465", "bgm466", "bgm467", "bgm468", "bgm469", "bgm470", "bgm471", "bgm472", "bgm473", "bgm474", "bgm475", "bgm476", "bgm477", "bgm478", "bgm479", "bgm480", "bgm481", "bgm482", "bgm483", "bgm484", "bgm485", "bgm486", "bgm487", "bgm488", "bgm489", "bgm490", "bgm491", "bgm492", "bgm493", "bgm494", "bgm495", "bgm496", "bgm497", "bgm498", "bgm499", "bgm500", "bgm501", "bgm502", "bgm503", "bgm504", "bgm505", "bgm506", "bgm507", "bgm508", "bgm509", "bgm510", "bgm511", "bgm512", "bgm513", "bgm514", "bgm515", "bgm516", "bgm517", "bgm518", "bgm519", "bgm520", "bgm521", "bgm522", "bgm523", "bgm524", "bgm525", "bgm526", "bgm527", "bgm528", "bgm529", "bgm530", "bgm531", "bgm532", "bgm533", "bgm534", "bgm535", "bgm536", "bgm537", "bgm538", "bgm539", "bgm540", "bgm541", "bgm542", "bgm543", "bgm544", "bgm545", "bgm546", "bgm547", "bgm548", "bgm549", "bgm550", "bgm551", "bgm552", "bgm553", "bgm554", "bgm555", "bgm556", "bgm557", "bgm558", "bgm559", "bgm560", "bgm561", "bgm562", "bgm563", "bgm564", "bgm565", "bgm566", "bgm567", "bgm568", "bgm569", "bgm570", "bgm571", "bgm572", "bgm573", "bgm574", "bgm575", "bgm576", "bgm577", "bgm578", "bgm579", "bgm580", "bgm581", "bgm582", "bgm583", "bgm584", "bgm585", "bgm586", "bgm587", "bgm588", "bgm589", "bgm590", "bgm591", "bgm592", "bgm593", "bgm594", "bgm595", "bgm596", "bgm597", "bgm598", "bgm599", "bgm600", "bgm601", "bgm602", "bgm603", "bgm604", "bgm605", "bgm606", "bgm607", "bgm608", "bgm609", "bgm610", "bgm611", "bgm612", "bgm613", "bgm614", "bgm615", "bgm616", "bgm617", "bgm618", "bgm619", "bgm620", "bgm621", "bgm622", "bgm623", "bgm624", "bgm625", "bgm626", "bgm627", "bgm628", "bgm629", "bgm630", "bgm631", "bgm632", "bgm633", "bgm634", "bgm635", "bgm636", "bgm637", "bgm638", "bgm639", "bgm640", "bgm641", "bgm642", "bgm643", "bgm644", "bgm645", "bgm646", "bgm647", "bgm648", "bgm649", "bgm650", "bgm651", "bgm652", "bgm653", "bgm654", "bgm655", "bgm656", "bgm657", "bgm658", "bgm659", "bgm660", "bgm661", "bgm662", "bgm663", "bgm664", "bgm665", "bgm666", "bgm667", "bgm668", "bgm669", "bgm670", "bgm671", "bgm672", "bgm673", "bgm674", "bgm675", "bgm676", "bgm677", "bgm678", "bgm679", "bgm680", "bgm681", "bgm682", "bgm683", "bgm684", "bgm685", "bgm686", "bgm687", "bgm688", "bgm689", "bgm690", "bgm691", "bgm692", "bgm693", "bgm694", "bgm695", "bgm696", "bgm697", "bgm698", "bgm699", "bgm700", "bgm701", "bgm702", "bgm703", "bgm704", "bgm705", "bgm706", "bgm707", "bgm708", "bgm709", "bgm710", "bgm711", "bgm712", "bgm713", "bgm714", "bgm715", "bgm716", "bgm717", "bgm718", "bgm719", "bgm720", "bgm721", "bgm722", "bgm723", "bgm724", "bgm725", "bgm726", "bgm727", "bgm728", "bgm729", "bgm730", "bgm731", "bgm732", "bgm733", "bgm734", "bgm735", "bgm736", "bgm737", "bgm738", "bgm739", "bgm740", "bgm741", "bgm742", "bgm743", "bgm744", "bgm745", "bgm746", "bgm747", "bgm748", "bgm749", "bgm750", "bgm751", "bgm752", "bgm753", "bgm754", "bgm755", "bgm756", "bgm757", "bgm758", "bgm759", "bgm760", "bgm761", "bgm762", "bgm763", "bgm764", "bgm765", "bgm766", "bgm767", "bgm768", "bgm769", "bgm770", "bgm771", "bgm772", "bgm773", "bgm774", "bgm775", "bgm776", "bgm777", "bgm778", "bgm779", "bgm780", "bgm781", "bgm782", "bgm783", "bgm784", "bgm785", "bgm786", "bgm787", "bgm788", "bgm789", "bgm790", "bgm791", "bgm792", "bgm793", "bgm794", "bgm795", "bgm796", "bgm797", "bgm798", "bgm799", "bgm800", "bgm801", "bgm802", "bgm803", "bgm804", "bgm805", "bgm806", "bgm807", "bgm808", "bgm809", "bgm810", "bgm811", "bgm812", "bgm813", "bgm814", "bgm815", "bgm816", "bgm817", "bgm818", "bgm819", "bgm820", "bgm821", "bgm822", "bgm823", "bgm824", "bgm825", "bgm826", "bgm827", "bgm828", "bgm829", "bgm830", "bgm831", "bgm832", "bgm833", "bgm834", "bgm835", "bgm836", "bgm837", "bgm838", "bgm839", "bgm840", "bgm841", "bgm842", "bgm843", "bgm844", "bgm845", "bgm846", "bgm847", "bgm848", "bgm849", "bgm850", "bgm851", "bgm852", "bgm853", "bgm854", "bgm855", "bgm856", "bgm857", "bgm858", "bgm859", "bgm860", "bgm861", "bgm862", "bgm863", "bgm864", "bgm865", "bgm866", "bgm867", "bgm868", "bgm869", "bgm870", "bgm871", "bgm872", "bgm873", "bgm874", "bgm875", "bgm876", "bgm877", "bgm878", "bgm879", "bgm880", "bgm881", "bgm882", "bgm883", "bgm884", "bgm885", "bgm886", "bgm887", "bgm888", "bgm889", "bgm890", "bgm891", "bgm892", "bgm893", "bgm894", "bgm895", "bgm896", "bgm897", "bgm898", "bgm899", "bgm900", "bgm901", "bgm902", "bgm903", "bgm904", "bgm905", "bgm906", "bgm907", "bgm908", "bgm909", "bgm910", "bgm911", "bgm912", "bgm913", "bgm914", "bgm915", "bgm916", "bgm917", "bgm918", "bgm919", "bgm920", "bgm921", "bgm922", "bgm923", "bgm924", "bgm925", "bgm926", "bgm927", "bgm928", "bgm929", "bgm930", "bgm931", "bgm932", "bgm933", "bgm934", "bgm935", "bgm936", "bgm937", "bgm938", "bgm939", "bgm940", "bgm941", "bgm942", "bgm943", "bgm944", "bgm945", "bgm946", "bgm947", "bgm948", "bgm949", "bgm950", "bgm951", "bgm952", "bgm953", "bgm954", "bgm955", "bgm956", "bgm957", "bgm958", "bgm959", "bgm960", "bgm961", "bgm962", "bgm963", "bgm964", "bgm965", "bgm966", "bgm967", "bgm968", "bgm969", "bgm970", "bgm971", "bgm972", "bgm973", "bgm974", "bgm975", "bgm976", "bgm977", "bgm978", "bgm979", "bgm980", "bgm981", "bgm982", "bgm983", "bgm984", "bgm985", "bgm986", "bgm987", "bgm988", "bgm989", "bgm990", "bgm991", "bgm992", "bgm993", "bgm994", "bgm995", "bgm996", "bgm997", "bgm998", "bgm999"
        ];

        var MUSIC_VERBS = [
            "MUSICVERB",
            "move", "action", "create", "destroy", "cantmove"
        ];

        var MUSIC_DIRECTIONS = [
            "DIRECTION",
            "up","down","left","right","horizontal","vertical","orthogonal"]

        var WINCONDITION_WORDS = [
            "LOGICWORD",
            "some", "on", "no", "all"]

        var LEGEND_LOGICWORDS = [
                "LOGICWORD",
                "and","or"
            ]

        var PRELUDE_COLOR_PALETTE_WORDS = [
            "mastersystem", "gameboycolour", "amiga", "arnecolors", "famicom", "atari", "pastel", "ega", "amstrad", "proteus_mellow", "proteus_rich", "proteus_night", "c64", "whitingjp"
        ]

        function renderHint(elt,data,cur){
            var t1=cur.text;
            var t2=cur.extra;
            var tag=cur.tag;
            if (t1.length==0){
                t1=cur.extra;
                t2=cur.text;
            }
            var wrapper = document.createElement("span")
            wrapper.className += " cm-s-midnight ";

            var h = document.createElement("span")                // Create a <h1> element
            // h.style.color="white";
            var t = document.createTextNode(t1);     // Create a text node

            h.appendChild(t);   
            wrapper.appendChild(h); 

            if (tag!=null){
                h.className += "cm-" + tag;
            }

            elt.appendChild(wrapper);//document.createTextNode(cur.displayText || getText(cur)));

            if (t2.length>0){
                var h2 = document.createElement("span")                // Create a <h1> element
                h2.style.color="orange";
                var t2 = document.createTextNode(" "+t2);     // Create a text node
                h2.appendChild(t2);  
                h2.style.color="orange";
                elt.appendChild(t2);
            }
        }

        CodeMirror.registerHelper("hint", "anyword", function(editor, options) {

            var word = options && options.word || WORD;
            var range = options && options.range || RANGE;
            var cur = editor.getCursor(),
                curLine = editor.getLine(cur.line);

            var end = cur.ch,
                start = end;

            var lineToCursor = curLine.substr(0,end);

            while (start && word.test(curLine.charAt(start - 1))) --start;
            var curWord = start != end && curLine.slice(start, end);

            var tok = editor.getTokenAt(cur);
            var state = tok.state;

            // ignore empty word
            if (!curWord || state.commentLevel>0) {
                // if ( 
                //         ( state.section=="" && curLine.trim()=="")  
                //         // || ( state.section=="objects" && state.objects_section==2 ) 
                //     ) {
                //     curWord="";
                // } else {
                    return {
                        list: []
                    };
                // }            
            }

            var addObjects = false;
            var excludeProperties = false;
            var excludeAggregates = false;
            var candlists = [];
            var toexclude = [];
            switch (state.section) {
                case 'objects':
                    {
                        if (state.objects_section==2){
                            candlists.push(COLOR_WORDS);
                        }
                        break;
                    }
                case 'legend':
                    {
                        var splits = lineToCursor.toLowerCase().split(/[\p{Z}\s]/u).filter(function(v) {
                            return v !== '';
                        });
                        toexclude=splits.filter(a => LEGEND_LOGICWORDS.indexOf(a)===-1);//don't filter out and or or
                        if (lineToCursor.indexOf('=')>=0){
                            if ((lineToCursor.trim().split(/\s+/ ).length%2)===1){
                                addObjects=true;
                            } else {
                                candlists.push(LEGEND_LOGICWORDS);                      
                            }
                        } //no hints before equals
                        break;
                    }
                case 'sounds':
                    {
                        /*
                        SOUNDEVENT SOUND 
                        NAME
                            SOUNDVERB <SOUND>
                            SOUNDVERB
                                <SOUND>
                                DIRECTION+ <SOUND>
                                */
                        var last_idx = state.current_line_wip_array.length-1;
                        if (last_idx>0 && state.current_line_wip_array[last_idx]==="ERROR"){
                            //if there's an error, just try to match greedily
                            candlists.push(SOUND_VERBS);
                            candlists.push(SOUND_DIRECTIONS);
                            candlists.push(SOUND_EVENTS);
                            addObjects=true;
                            excludeAggregates=true;       
                        } else if (state.current_line_wip_array.length<=1 ){
                            candlists.push(SOUND_EVENTS);
                            addObjects=true;
                            excludeAggregates=true;                            
                        } else  {
                            var lastType =  state.current_line_wip_array[last_idx][1];
                            switch (lastType){
                                case "SOUNDEVENT":
                                    {
                                        break;
                                    }
                                case "NAME":
                                    {
                                        candlists.push(SOUND_VERBS);
                                        break;
                                    }
                                case "SOUNDVERB":
                                case "DIRECTION":
                                    {
                                        candlists.push(SOUND_DIRECTIONS);
                                        break;
                                    }
                                case "SOUND":
                                    {
                                    }
                            }                                                 
                        }
                        break;
                    }
                case 'musics':
                    {
                        /*
                        MUSICEVENT MUSIC 
                        NAME
                            MUSICVERB <MUSIC>
                            MUSICVERB
                                <MUSIC>
                                DIRECTION+ <SOUND>
                                */
                        var last_idx = state.current_line_wip_array.length-1;
                        if (last_idx>0 && state.current_line_wip_array[last_idx]==="ERROR"){
                            //if there's an error, just try to match greedily
                            candlists.push(MUSIC_VERBS);
                            candlists.push(MUSIC_DIRECTIONS);
                            candlists.push(MUSIC_EVENTS);
                            addObjects=true;
                            excludeAggregates=true;       
                        } else if (state.current_line_wip_array.length<=1 ){
                            candlists.push(MUSIC_EVENTS);
                            addObjects=true;
                            excludeAggregates=true;                            
                        } else  {
                            var lastType =  state.current_line_wip_array[last_idx][1];
                            switch (lastType){
                                case "MUSICEVENT":
                                    {
                                        break;
                                    }
                                case "NAME":
                                    {
                                        candlists.push(MUSIC_VERBS);
                                        break;
                                    }
                                case "MUSICVERB":
                                case "DIRECTION":
                                    {
                                        candlists.push(MUSIC_DIRECTIONS);
                                        break;
                                    }
                                case "MUSIC":
                                    {
                                    }
                            }                                                 
                        }
                        break;
                    }
                case 'collisionlayers':
                    {
                        var splits = lineToCursor.toLowerCase().split(/[,\p{Z}\s]/u).filter(function(v) {
                            return v !== '';
                        });
                        toexclude=splits;
                        addObjects=true;
                        excludeAggregates=true;
                        break;
                    }
                case 'rules':
                    {   
                        //if inside of roles,can use some extra directions
                        if (lineToCursor.indexOf("[")==-1) {
                            candlists.push(RULE_DIRECTION_WORDS);
                            candlists.push(LOOP_WORDS);
                        } else {
                            candlists.push(PATTERN_DIRECTION_WORDS);                            
                        }
                        if (lineToCursor.indexOf("->")>=0) {
                            candlists.push(RULE_COMMAND_WORDS);
                        }
                        addObjects=true;
                        break;
                    }
                case 'winconditions':
                    {
                        if ((lineToCursor.trim().split(/\s+/ ).length%2)===0){
                            addObjects=true;
                        }
                        candlists.push(WINCONDITION_WORDS);
                        break;
                    }
                case 'levels':
                    {
                        if ("message".indexOf(lineToCursor.trim())===0) {
                            candlists.push(["MESSAGE_VERB","message"]);
                        }
                        break;
                    }
                default: //preamble
                    {
                        var lc = lineToCursor.toLowerCase();
                        if (lc.indexOf("background_color")>=0 ||
                            lc.indexOf("text_color")>=0) {
                            candlists.push(COLOR_WORDS);
                        } else {
                            var linewords =lineToCursor.trim().split(/\s+/ );

                            if (linewords.length<2) {
                                candlists.push(PRELUDE_COMMAND_WORDS);
                            } else if (linewords.length==2 && linewords[0].toLowerCase()=='color_palette'){
                                candlists.push(PRELUDE_COLOR_PALETTE_WORDS);
                            }
                        }

                        break;
                    }
            }
            // case insensitive
            curWord = curWord.toLowerCase();

            var list = options && options.list || [],
                seen = {};

            //first, add objects if needed
            if (addObjects){
                var obs = state.objects;
                for (var key in obs) {
                    if (obs.hasOwnProperty(key)) {
                        var w = key;
                        var matchWord = w.toLowerCase();
                        // if (matchWord === curWord) continue;
                        if ((!curWord || matchWord.lastIndexOf(curWord, 0) == 0) && !Object.prototype.hasOwnProperty.call(seen, matchWord)) {
                            seen[matchWord] = true;
                            var hint = state.original_case_names[w]; 
                            list.push({text:hint,extra:"",tag:"NAME",render:renderHint});
                        }
                    }
                }

                var legendbits = [state.legend_synonyms];
                if (!excludeProperties){
                    legendbits.push(state.legend_properties);
                }
                if (!excludeAggregates){
                    legendbits.push(state.legend_aggregates);
                }

                //go throuhg all derived objects
                for (var i=0;i<legendbits.length;i++){
                    var lr = legendbits[i];
                    for (var j=0;j<lr.length;j++){
                        var w = lr[j][0];
                        var matchWord = w.toLowerCase();
                        // if (matchWord === curWord) continue;
                        if ((!curWord || matchWord.lastIndexOf(curWord, 0) == 0) && !Object.prototype.hasOwnProperty.call(seen, matchWord)) {
                            seen[matchWord] = true;
                            var hint = state.original_case_names[w]; 
                            list.push({text:hint,extra:"",tag:"NAME",render:renderHint});
                        }
                    }
                }

            }

            // go through random names
            for (var i = 0; i < candlists.length; i++) {
                var candlist = candlists[i]
                var tag = candlist[0];
                for (var j = 1; j < candlist.length; j++) {
                    var m = candlist[j];
                    var orig = m;
                    var extra=""
                    if (typeof m !== 'string'){
                        if (m.length>1){
                            extra=m[1]
                        }
                        m=m[0];
                    }
                    var matchWord=m;
                    var matchWord = matchWord.toLowerCase();
                    // if (matchWord === curWord) continue;
                    if ((!curWord || matchWord.lastIndexOf(curWord, 0) == 0) && !Object.prototype.hasOwnProperty.call(seen, matchWord)) {
                        seen[matchWord] = true;

                        var mytag = tag;
                        if (mytag==="COLOR"){
                            mytag = "COLOR-"+m.toUpperCase();
                        }                    

                        list.push({text:m,extra:extra,tag:mytag,render:renderHint});
                    }
                }
            }
            

            //state.legend_aggregates
            //state.legend_synonyms
            //state.legend_properties
            //state.objects

            //remove words from the toexclude list

            
            if (toexclude.length>0){
                if (toexclude[toexclude.length-1]===curWord){
                    splits.pop();
                }
                for (var i=0;i<list.length;i++){
                    var lc = list[i].text.toLowerCase();
                    if (toexclude.indexOf(lc)>=0){
                        list.splice(i,1);
                        i--;
                    }
                }
            }
                    //if list is a single word and that matches what the current word is, don't show hint
            if (list.length===1 && list[0].text.toLowerCase()===curWord){
                list=[];
            }
            //if list contains the word that you've typed, put it to top of autocomplete list
            for (var i=1;i<list.length;i++){
                if (list[i].text.toLowerCase()===curWord){
                    var newhead=list[i];
                    list.splice(i,1);
                    list.unshift(newhead);
                    break;
                }
            }
            //if you're editing mid-word rather than at the end, no hints.
            if (tok.string.trim().length>curWord.length){
                list=[];
            }
            return {
                list: list,
                from: CodeMirror.Pos(cur.line, start),
                to: CodeMirror.Pos(cur.line, end)
            };
        });

    // https://statetackoverflow.com/questions/13744176/codemirror-autocomplete-after-any-keyup
    CodeMirror.ExcludedIntelliSenseTriggerKeys = {
        "9": "tab",
        "13": "enter",
        "16": "shift",
        "17": "ctrl",
        "18": "alt",
        "19": "pause",
        "20": "capslock",
        "27": "escape",
        "33": "pageup",
        "34": "pagedown",
        "35": "end",
        "36": "home",
        "37": "left",
        "38": "up",
        "39": "right",
        "40": "down",
        "45": "insert",
        "91": "left window key",
        "92": "right window key",
        "93": "select",
        "107": "add",
        "109": "subtract",
        "110": "decimal point",
        "111": "divide",
        "112": "f1",
        "113": "f2",
        "114": "f3",
        "115": "f4",
        "116": "f5",
        "117": "f6",
        "118": "f7",
        "119": "f8",
        "120": "f9",
        "121": "f10",
        "122": "f11",
        "123": "f12",
        "144": "numlock",
        "145": "scrolllock",
        "186": "semicolon",
        "187": "equalsign",
        "188": "comma",
        // "189": "dash",
        "190": "period",
        "191": "slash",
        "192": "graveaccent",
        "220": "backslash",
        "222": "quote"
    }
});
