<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"> 
<style>
#status { margin: 1em 0; padding: 1em; border: 1px solid black; display: inline-block; }
html, body { font-family:sans-serif; width:100%; height:100%; padding:0; margin:0; }
.screen { width:calc(100%-1em); height:calc(100%-1em); padding:1em; display: none; }
#loading { display: block; }
#loading h1 { text-align: center; margin-top: 20vmin; }
#notifications { position: absolute; bottom: 1em; right: 1em; }
#notifications div {
	margin-top: 1em;
	padding: 1em;
	border: 1px solid black;
	border-radius: 0.5em;
	background-color: #fdd;
	transition: opacity 1s ease-out;
	opacity: 0;
	display: none;
}
</style>
</head>
<body>

<div class="screen" id="loading">
	<h1>Loading...</h1>
</div>

<div class="screen" id="home">
	<h1>Offline Test</h1>

	<input type="button" id="installButton" value="Installer" onclick="App.install()" />

	<p>
		<img src="assets/earth1.jpg" style="max-height:20vh; max-width:20vw;" />
		<img src="assets/earth2.jpg" style="max-height:20vh; max-width:20vw;" />
		<img src="assets/earth3.jpg" style="max-height:20vh; max-width:20vw;" />
		<img src="assets/earth4.jpg" style="max-height:20vh; max-width:20vw;" />
</div>

<div id="notifications"></div>

<?php
	$useServiceWorker = !isset($_GET['nocache']);
	if($useServiceWorker) // add service worker script
		echo '<script src="offline-handler.js"></script>'."\n";
?>
<script src="app-core.js"></script>
</body>
<html>
