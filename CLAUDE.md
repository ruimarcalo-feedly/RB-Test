# Project instructions

## Task completion sound
At the end of every task (after the final file change or ready_for_verification), play a notification chime by calling eval_js_user_view with:
```js
(function(){var c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.value=880;g.gain.setValueAtTime(0.25,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.4);o.start(c.currentTime);o.stop(c.currentTime+0.4)})()
```
