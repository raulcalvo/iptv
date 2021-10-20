# IPTV

<h2> What is IPTV </h2>
IPTV is a service written in Node JS , wich exposes and http api to create and manage m3u8 playlists. These playlists are refreshed periodically, and can be "filled" with simple m3u8 channels or acestream links.

When service is started you can access to a self-explained and usable version of the API in:
http://localhost:9999/api

<h2>Requeriments:</h2>
Node JS installed.

<h2>Using IPTV:</h2>
- git clone https://github.com/raulcalvo/iptv<br>
- cd iptv<br>
- cd src<br>
- npm install<br>
- node index.js<br>

In order to understand the behaviour of the software you may consider continue reading.

<h2>Understanding IPTV</h2>
<h3>Lists</h3>
With the exposed API you can create lists, these lists have a few parameters:<br>
- List name<br>
- Acestream host to play acestream links<br>
- Acestream host's port<br>

After creating a list (named FOO for example), you can download it in m3u8 format using:<br>
http://localhost:9999/tv.m3u8?list=FOO<br>

<h3>Sources</h3>
The sources of these m3u8 playlists can be:<br>
- Simple channels: An URL pointing to one m3u8 channel, and a name to identify it.<br>
- URL: Url to a webpage that contains acestream links. These kind of sources have alse some extra parameters:<br>
&nbsp;&nbsp;* Interval - Minutes between every refresh of this source<br>
&nbsp;&nbsp;* inludeM3u8 - If true, when parsing url, m3u8 links present in the web page will be included in the playlist as simple channels<br>

<h3>How it works</h3>
For every URL source, every "interval" time, IPTV will parse the webpage "URL", extract all the acestream links and put them into the source's playlist.<br>


