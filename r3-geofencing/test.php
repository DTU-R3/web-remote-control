<?php

//<For debugging>
$ORIGINAL_INPUT = file_get_contents('php://input', false, null, 0, 1048576);

function debugInfo() {
	if (function_exists('getallheaders')) {
		$ALL_HEADERS = getallheaders();
	} else {	//nginx	http://php.net/getallheaders#84262
		$ALL_HEADERS = array();
		foreach ($_SERVER as $name => $value) {
			if (substr($name, 0, 5) === 'HTTP_') {
				$ALL_HEADERS[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
			}
		}
	}
	global $ORIGINAL_INPUT;
	return print_r(
		array(
			'date' => date('c'),
			'headers' => $ALL_HEADERS,
			'_SERVER' => $_SERVER,
			'_GET' => $_GET,
			'_POST' => $_POST,
			'_COOKIE' => $_COOKIE,
			'INPUT' => $ORIGINAL_INPUT
		), true);
}
//</For debugging>

	//TODO: Get the text from HTTP POST parameter
	$text = $ORIGINAL_INPUT;//debugInfo();
	
	//TODO: Sanitise input / handle exceptions
	
	$json = json_decode($text, true);

	$json['Hello'] = 'World';

	$dir = __DIR__ . '/data';

	echo("hello");
	
	//TODO: Write $text
	file_put_contents($dir . '/test.json', json_encode($json));

	//TODO: read back
?>
<html>
<head>
 <title>myform</title>
</head>
<body>
	<!-- TODO: echo text -->
</body>
</html>
