# PuzzleScript-MML

Play MML music in PuzzleScript. you can use them as BGM or SFX.

MML https://en.wikipedia.org/wiki/Music_Macro_Language

MMLEmitter https://github.com/mohayonao/mml-emitter (MIT License)

## New Features:

### Added `MUSICS` Section 

To write and play MML music in game. Use `bgm000` to `bgm999`; You can also use the same keywords as in the SOUNDS section. You can choose 4 simple tones(sine, square, sawtooth, triangle).

**CTRL + Click** the underlined MML text to play a song [Volume Attention!]. **CTRL + Q** to stop the music (or click **Stop MML** buttons at sfx-buttons-bar).

No error message is shown in editor console if your MML is wrong. watch browser's console log. (Search "SyntaxError: Unexpected token: xx")

(Why is the section name plural?)

### `PRELUDE` Section

`do_not_stop_music_on_restart` to continue the BGM even when you press a Restart key. It is useful for Background music.

### `SOUNDS` Section

Use `sfx000` to `sfx999` instead of `sfx0` to `sfx10`.

### `RULES` Section

Right-hand Side `stopmusic` will stop all the music in game instantly. 

## How to use:

(1) Add `MUSICS` section after `SOUNDS` section.

(2) Select `bgm000` - `bgm999` and write MML between `" "` in 1-line. See also [MML Editor](https://competor.github.io/PuzzleScript-MML/src/mmleditor.html).

(3) [Volume Attention!] **CTRL + Click** the underlined MML text to play a song in editor. 

(4) To stop MML, Click `STOP MML` in the sound-bar or **CTRL + Q**. All music stop even in-game BGM.

## Samples:

`bgm000 "t120v40q1o3l8@1 $[cgb][f>ce][eb>d][<b>f>ce];t120v30q100o5l4@4 $g^rde^rc<b^r>c8d8<g^^r a^r>cd^rc<g^ra8>c8e^^r"`

`bgm001 "$t140q5v50 /:o4l16bag+a>c8r8dc<b>ce8r8fed+ebag+abag+a>c4<a8>c8<l8[gb][f+a][eg][f+a][gb][f+a][eg][f+a][gb][f+a][eg][d+f+]e4:/ /:o5[ce][df][eg][eg]a16g16f16e16[<b>d]4[ce][df][eg][eg]a16g16f16e16[<b>d]4[<a>c][<b>d][ce][ce]f16e16d16c16<[g+b]4[a>c][b>d]>[ce][ce]f16e16d16c16<[g+b]4l16bag+a>c8r8dc<b>ce8r8fed+ebag+abag+al8>c4<ab>c<bag+aefdc4<b8.a32b32a4 :/ ;$t140q50v30/:o3l8r4a>[ce][ce][ce]<a>[ce][ce][ce]<a>[ce]<a>[ce]<a>[ce][ce][ce]<e[b>e][b>e][b>e]e[b>e][b>e][b>e]e[b>e]<b>be4:/ /:o3r4c>c<e>e<g>g<r4c>c<e>e<g4r4<a>ac>c<e>e<r4<a>ac>c<e4r4a>[ce][ce][ce]<a>[ce][ce][ce]<a>[ce]<a>[ce]<f[a>d+][a>d+][a>d+]e[ae]d[fb]c[ea]d[fb][ea][ea][eg+][eg+][<a>a]4:/;"`

Use as a SFX!

`endlevel "t200l16q1o7 c>c>c"`

## MML Commands:

For example, `bgm001 "t120 v80 l8 o4 cdefg^^r > gfedc^^r"` represents `tempo=120 volume=80 note-length=8 octave=4` and plays following notes: `o4 cdefg--, o5 gfedc--,`.

[See MML Editor](https://competor.github.io/PuzzleScript-MML/src/mmleditor.html)

## SHARE link

* Upload your script for [Github Gist](https://gist.github.com/)

* Modify filename to **script.txt** and create secret/public gist.

* Copy the ID at the end of the gist: https://gist.github.com/(yourname)/debc0ce29ebc86df47d2fac5c5497999

* Paste the ID at the end of this URL: https://competor.github.io/PuzzleScript-MML/src/play.html?p=(pastehere)

* The game is now shareable! https://competor.github.io/PuzzleScript-MML/src/play.html?p=debc0ce29ebc86df47d2fac5c5497999


## Can't do this

* Keep BGM playing when a level changed.

* ~~Multiple line MML~~ Use [MML Editor](https://competor.github.io/PuzzleScript-MML/src/mmleditor.html)'s "Convert to 1-line" button instead!

## Known bugs

* When you click EXPORT or SHARE your file, `titlescreen` BGM doesn't be played, because of ["Autoplay policy"](https://developer.chrome.com/blog/autoplay/) of your browser (You need to interact (click, tap, etc.) to allow the audio.) But when you upload this html file for itch.io or somewhere, and if you "click to start" the game, it will work correctly.

## See Also

* [MML(Music Macro Language) Iterator](https://github.com/mohayonao/mml-iterator)

* MMLEmitter dev's blog post: [Web Audio API用のMMLイベントシーケンサー wamml です](https://mohayonao.hatenablog.com/entry/2014/08/18/135210)

* [Web Audio API 解説](https://www.g200kg.com/jp/docs/webaudio/index.html)
