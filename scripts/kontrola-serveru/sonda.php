<?php
// Sonda workflow kontrola-serveru.yml: nahraje se pod náhodným jménem do api/, vypíše jen verzi PHP a SAPI
// a hned se sama smaže (workflow ji pak maže ještě jednou a ověří, že zmizela). Do api/ v repu nepatří.
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
echo PHP_VERSION, "\n", php_sapi_name(), "\n";
@unlink(__FILE__);
