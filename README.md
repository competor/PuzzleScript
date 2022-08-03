# PuzzleScript-MML

play music in puzzleScript. you can use as BGM or melodious SFX.

MML https://en.wikipedia.org/wiki/Music_Macro_Language

MMLEmitter https://github.com/mohayonao/mml-emitter (MIT License)

## How to use:

(1) Add `MUSICS` section after `SOUNDS` section.

(2) Select `bgm0` - `bgm10` and write MML in `" "` in 1-line. 

* Also you can use same keywords as SOUNDS. For example: `startlevel "t120v40q1o3l8@1 $[cgb][f>ce][eb>d][<b>f>ce];t120v30q100o5l4@4 $g^rde^rc<b^r>c8d8<g^^r a^r>cd^rc<g^ra8>c8e^^r"`

* Use [MML Editor](https://competor.github.io/PuzzleScript-MML/src/mmleditor.html) at the top-bar of the editor if you want.

(3) CTRL + Click the underlined MML text to play a song. [Volume Attention!]

(4) To stop MML, Click `STOP MML` in the top-bar. All music stops even in-game BGM.

## Sample:

W.A.Mozart - Turkish March (from http://mohayonao.github.io/mml-emitter/ )

`bgm0 "$t140q5v50 /:o4l16bag+a>c8r8dc<b>ce8r8fed+ebag+abag+a>c4<a8>c8<l8[gb][f+a][eg][f+a][gb][f+a][eg][f+a][gb][f+a][eg][d+f+]e4:/ /:o5[ce][df][eg][eg]a16g16f16e16[<b>d]4[ce][df][eg][eg]a16g16f16e16[<b>d]4[<a>c][<b>d][ce][ce]f16e16d16c16<[g+b]4[a>c][b>d]>[ce][ce]f16e16d16c16<[g+b]4l16bag+a>c8r8dc<b>ce8r8fed+ebag+abag+al8>c4<ab>c<bag+aefdc4<b8.a32b32a4 :/ ;$t140q50v30/:o3l8r4a>[ce][ce][ce]<a>[ce][ce][ce]<a>[ce]<a>[ce]<a>[ce][ce][ce]<e[b>e][b>e][b>e]e[b>e][b>e][b>e]e[b>e]<b>be4:/ /:o3r4c>c<e>e<g>g<r4c>c<e>e<g4r4<a>ac>c<e>e<r4<a>ac>c<e4r4a>[ce][ce][ce]<a>[ce][ce][ce]<a>[ce]<a>[ce]<f[a>d+][a>d+][a>d+]e[ae]d[fb]c[ea]d[fb][ea][ea][eg+][eg+][<a>a]4:/;"`

Use as a SFX!

`endlevel "t200l16q1o7 c>c>c"`

## Commands:

For example, `bgm1 "t120 v80 l8 o4 cdefg>gfedc"` represents `tempo=120 volume=80 note-length=8 octave=4` and plays following notes: `cdefg>gfedc`.

**Note event**

`cdefgab` Note. 

* `c4 e8 g16 b3` The number following the note means the length of the note.

* `c4.` Dotted quarter note.

* `+` Sharp, `-` Flat. `c+8` represents a C# eighth note.

`r` Rest note. `r2.` is a dotted half rest.

**Note Length**

`l` Set the following notes length. [default 4] `l4 cde` means `c4 d4 e4` .

`^` Tie.

`q` Quantize(gate time) [default 75] Try this: `q100 cdef q50 cdef q10 cdef q200 cdef`

**Note Pitch**

`o` Set octave. [default: 4]

`>`, `<` Step up or down one octave relatively. `cdefgab>c`

**Control**

`t` Tempo(bpm) [default: 120]

`v` Velocity(volume) [default: 100]

`@` Tone. [default: 1] 

* 1 = sine, 2 = square, 3 = sawtooth, 4 = triangle. Try this: `@1 ef @2 ef @3 ef @4 ef`

`[ ]` Play multi notes in same time (chord). `v50q40 /: g4 l2 [ b>df+ ] d4 l2 [a>c+f+] :/`

`/: | :/` Loop. [default 2] 

* `l8 /: cd :/4 e` Repeat 4 time. 

* Also you can nest them: `/: c /: d /: e :/ f :/ g :/` But don't repeat the slashes like `://:` . Please insert a space: `:/ /:` .
* Commands after `|` are skipped in the last loop. `/: cde | f :/3 dc` is played as `cdef cdef cdedc` .

`$` Inifinite loop.

`;` Make multi-tracks. Every track is separated, so you have to set the tempo,volume, etc. again.

## Can't do this

* SHARE link

* Keep BGM playing when the level changes.

* Stop BGM with a code, sorry!

* ~~multiple line MML~~ Use [MML Editor](https://competor.github.io/PuzzleScript-MML/src/mmleditor.html) instead!

* ~~change the BGM. for example, if you go to the next level.~~ If you want to change the bgm by levels, don't use `Startlevel`. Instead, This would be nice to be coded with `run_rules_on_level_start`, when some init-object is there, play `BGMnn` in the first turn.

* ADSR envelope control. Do you really need this?

* no error message is shown in editor console if your MML is wrong. watch browser's console log. (Search "SyntaxError: Unexpected token: xx")

## Known bugs

* When you click EXPORT to make html, `titlescreen` BGM doesn't be played, because of ["Autoplay policy"](https://developer.chrome.com/blog/autoplay/) of your browser (You need to interact (click, tap, etc.) to allow the audio.) But when you upload this html file for itch.io or somewhere, and if you "click to start" the game, it will work correctly.

## See Also

* [MML(Music Macro Language) Iterator](https://github.com/mohayonao/mml-iterator)

* MMLEmitter dev's blog post: [Web Audio API用のMMLイベントシーケンサー wamml です](https://mohayonao.hatenablog.com/entry/2014/08/18/135210)

* [Web Audio API 解説](https://www.g200kg.com/jp/docs/webaudio/index.html)