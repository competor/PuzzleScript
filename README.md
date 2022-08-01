# PuzzleScript MML (WIP)

play music in puzzleScript. you can use as BGM or melodious SFX.

MML https://en.wikipedia.org/wiki/Music_Macro_Language

MMLEmitter https://github.com/mohayonao/mml-emitter (MIT License)

## usage:

(1) Add `MUSICS` section

(2) Select `bgm0` - `bgm10` and write MML in `" "`.

(3) CTRL + Click to play a song (Volume Attention!) 

## commands:

for example, `bgm1 "t120 v80 l8 o4 cdefg>gfedc"` represents `tempo(bpm)=120 volume=80 note-length=8 octave=4`.

`c+8` represents a C# eighth note, `cdefgab` with `+`(sharp), `-`(flat).

`r` or `r8` rest note.

`o` set octave.

`<`, `>` step up or down one octave. 

`t` tempo(bpm)

`v` velocity(volume) [0 - 100]

`l` note length

`q` quantize

`;` make multi-tracks. Every track is separated, so you have to set the tempo,volume, etc.

`/: cder :/ gedcdedr` repeat one time.

`[ ]` play multi notes in same time (chord). 

`$` inifinite loop the song.


## Can't do this:

* play music in-game (now only works in-editor lol.)

* stop music

* change BGM when you go to the next level

* change the tone