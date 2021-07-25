#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>

// Make the SSID and password the same as your own. You may not customize this unless you create an access point.
const char* ssid = "FTCNetwork"; 
const char* password =  "111428813"; 

ESP8266WebServer server(80);   //This will prompt the web page on port 80

String page = "";
String text = "";
double data;
void setup(void) {
  pinMode(A0, INPUT); // This determines the pin the sensor will have to connect to. The default is set at A0
  delay(1000);
  Serial.begin(115200); // This is the baudrate of the ESP-12E. Do not change this value.
  WiFi.begin(ssid, password); // This will prompt the webserver to start on the SSID and password of the WiFi network you are on
  Serial.println("");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.print("Connected established with ");
  Serial.println(ssid);
  Serial.print("IP address: "); // This will establish an IP address to the user in the Monitor
  Serial.println(WiFi.localIP());
  server.on("/data.txt", []() {
    text = (String)data +"%";
    server.send(200, "text/html", text);
  });
  server.on("/", []() {
    page = "<h1>Soil Moisture Server</h1><h1>Hydration Percentage:</h1> <h1 id=\"data\">""</h1>\r\n"; // These next few lines takes in the data from the moisture sensor and inputs it onto the page and gives a live feed without refreshing the page.
    page += "<script>\r\n";
    page += "var x = setInterval(function() {loadData(\"data.txt\",updateData)}, 1000);\r\n";
    page += "function loadData(url, callback){\r\n";
    page += "var xhttp = new XMLHttpRequest();\r\n";
    page += "xhttp.onreadystatechange = function(){\r\n";
    page += " if(this.readyState == 4 && this.status == 200){\r\n";
    page += " callback.apply(xhttp);\r\n";
    page += " }\r\n";
    page += "};\r\n";
    page += "xhttp.open(\"GET\", url, true);\r\n";
    page += "xhttp.send();\r\n";
    page += "}\r\n";
    page += "function updateData(){\r\n";
    page += " document.getElementById(\"data\").innerHTML = this.responseText;\r\n";
    page += "}\r\n";
    page += "</script>\r\n";
    server.send(200, "text/html", page);
  });

  server.begin();
  Serial.println("Congrats! The server has been successfully activated!");
}

void loop(void) {
  double data1 = analogRead(A0);
  data=((data1/900)*100); // This expresses the moisture level as a percentage when the level is reached. It hasn't been configured to be updated with the server yet.
  if (data >= 40)
    Serial.println("I'm feeling good!");
  else
    Serial.println("Hey, it's me the plant. I'm a bit thirsty over here. Would you mind giving me some water?");
  delay(1000);
  server.handleClient();
}
