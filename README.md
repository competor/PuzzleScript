# PuzzleScript MML (WIP)

play music in puzzleScript. you can use as BGM or melodious SFX.

MML https://en.wikipedia.org/wiki/Music_Macro_Language

MMLEmitter https://github.com/mohayonao/mml-emitter (MIT License)

## how to use:

(1) Add `MUSICS` section.

(2) Select `bgm0` - `bgm10` and write MML in `" "` in 1-line. Also you can use same keywords as SOUNDS.

(3) CTRL + Click to play a song. [Volume Attention!]

## commands:

For example, `bgm1 "t120 v80 l8 o4 cdefg>gfedc"` represents `tempo=120 volume=80 note-length=8 octave=4` and plays following notes: `cdefg>gfedc`.

`c` Note. `c c+ d d+ e f f+ g g+ a a+ b `

`+`(sharp), `-`(flat). `c+8` represents a C# eighth note.

`c4 e8 g16 b3` The number following the note means the length of the note. 

`c4.` Dotted quarter note.

`l` Set note length. `l4 cde` means `c4 d4 e4` .

`r` Rest note. `r4` is a quarter rest.

`o` Set octave.

`>`, `<` Step up or down one octave. `cdefgab>c`

`t` Tempo(bpm)

`v` Velocity(volume) [0 - 100]

`q` Quantize(gate time) try this:`l4 q100 cdef q50 cdef q10 cdef q200 cdef`

`;` Make multi-tracks. Every track is separated, so you have to set the tempo,volume, etc.

`/: cder :/ gedcdedr` Repeat one time. Also you can nest them, tricky: `/: c /: d /: e :/ f :/ g :/` Do not repeat the slash like `://:`. Please insert a space: `:/ /:` 

`[ ]` Play multi notes in same time (chord). `v50q40 /: g4 l2 [ b>df+ ] d4 l2 [a>c+f+] :/`

`$` Inifinite loop the song. There is no way to stop it, so use it only if you want it to play as one piece of background music forever.


## Can't do this:
* Export and Share.

* multiple line MML

* stop the playing music (why???)

* also, change the BGM. for example, if you go to the next level.

* change the tone.

* no error message is shown in editor console if your MML is wrong. watch browser's console log. (Search "SyntaxError: Unexpected token: xx")