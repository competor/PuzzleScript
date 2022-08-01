PuzzleScript MML

play music in puzzleScript.

============

MML https://en.wikipedia.org/wiki/Music_Macro_Language

MMLEmitter https://github.com/mohayonao/mml-emitter (MIT License)

usage

(1) Add `MUSICS` section

(2) `bgm0` - `bgm10` and write MML in `" "`.

(3) CTRL + click to play a song (Volume Attention!) 

commands:

for example, `t120 v80 l8 o4 cdefg>gfedc` represents `tempo(bpm)=120 volume=80[0-100] note-length=8 octave=4`.

`;` to make multi-tracks. Every track is separated, so you have to set the tempo,volume, etc.

`/: :` repeat one time.

`[ ]` play multi notes in same time(chord). 

`$` inifinite loop the song.

============

Can't do this:

* play music in-game (now only works in-editor.)

* stop music

* change BGM when you go to the next level