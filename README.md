# PuzzleScript MML (WIP)

play music in puzzleScript. you can use as BGM or melodious SFX.

MML https://en.wikipedia.org/wiki/Music_Macro_Language

MMLEmitter https://github.com/mohayonao/mml-emitter (MIT License)

## how to use:

(1) Add `MUSICS` section.

(2) Select `bgm0` - `bgm10` and write MML in `" "` in 1-line. Also you can use same keywords as SOUNDS.

* Use [MML Editor](https://competor.github.io/PuzzleScript-MML/src/mmleditor.html) in the Topbar in the Editor if you want

(3) CTRL + Click to play a song. [Volume Attention!]

(4) Click `STOP MML` in the Topbar. All music stops even in-game music.


## sample:
W.A.Mozart - Turkish March / from http://mohayonao.github.io/mml-emitter/

`bgm0 "$t140q5v50 /:o4l16bag+a>c8r8dc<b>ce8r8fed+ebag+abag+a>c4<a8>c8<l8[gb][f+a][eg][f+a][gb][f+a][eg][f+a][gb][f+a][eg][d+f+]e4:/ /:o5[ce][df][eg][eg]a16g16f16e16[<b>d]4[ce][df][eg][eg]a16g16f16e16[<b>d]4[<a>c][<b>d][ce][ce]f16e16d16c16<[g+b]4[a>c][b>d]>[ce][ce]f16e16d16c16<[g+b]4l16bag+a>c8r8dc<b>ce8r8fed+ebag+abag+al8>c4<ab>c<bag+aefdc4<b8.a32b32a4 :/ ;$t140q50v30/:o3l8r4a>[ce][ce][ce]<a>[ce][ce][ce]<a>[ce]<a>[ce]<a>[ce][ce][ce]<e[b>e][b>e][b>e]e[b>e][b>e][b>e]e[b>e]<b>be4:/ /:o3r4c>c<e>e<g>g<r4c>c<e>e<g4r4<a>ac>c<e>e<r4<a>ac>c<e4r4a>[ce][ce][ce]<a>[ce][ce][ce]<a>[ce]<a>[ce]<f[a>d+][a>d+][a>d+]e[ae]d[fb]c[ea]d[fb][ea][ea][eg+][eg+][<a>a]4:/;"`

Use as SFX!

`endlevel "t200l16q1o7 c>c>c"`

## commands:

For example, `bgm1 "t120 v80 l8 o4 cdefg>gfedc"` represents `tempo=120 volume=80 note-length=8 octave=4` and plays following notes: `cdefg>gfedc`.

Note event

`cdefgab` Note. `c4 e8 g16 b3` The number following the note means the length of the note. `c4.` Dotted quarter note.

`+`(sharp), `-`(flat). `c+8` represents a C# eighth note.

`r` Rest note. `r4` is a quarter rest.

Note Length

`l` Set note length. `l4 cde` means `c4 d4 e4` .

`^` Tie.

`q` Quantize(gate time) try this:`l4 q100 cdef q50 cdef q10 cdef q200 cdef`

Note Pitch

`o` Set octave. [default: 4]

`>`, `<` Step up or down one octave. `cdefgab>c`

Control

`t` Tempo(bpm) [default: 120]

`v` Velocity(volume) [default: 100]

`[ ]` Play multi notes in same time (chord). `v50q40 /: g4 l2 [ b>df+ ] d4 l2 [a>c+f+] :/`

`/: | :/` Loop(default 2). 

* `l8 /: cd :/4 e` Repeat 4 time. 

* Also you can nest them: `/: c /: d /: e :/ f :/ g :/` Do not repeat the slash like `://:`. Please insert a space: `:/ /:`. 
* Commands after `|` are skipped in the last loop. `/: cde | f :/3 dc`

`$` Inifinite loop.

`;` Make multi-tracks. Every track is separated, so you have to set the tempo,volume, etc.

## can't do this:
* Export and Share.

* ~~multiple line MML~~ Use [MML Editor](https://competor.github.io/PuzzleScript-MML/src/mmleditor.html) instead!

* ~~stop the playing music (why???)~~

* ~~also, change the BGM. for example, if you go to the next level.~~ If you want to change the bgm, don't use `Startlevel`. Instead, This would be nice to be coded with `run_rules_on_level_start`, when some init-object is there, play BGMnn` in the first turn.

* change the tone.

* no error message is shown in editor console if your MML is wrong. watch browser's console log. (Search "SyntaxError: Unexpected token: xx")

## known bugs

* `Player Move "cde"` doesn't work.

## See Also

MMLIterator https://github.com/mohayonao/mml-iterator / MML(Music Macro Language) Iterator