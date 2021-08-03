#include <ESP8266WiFi.h>
​
String apiKey = "VNABTK8GI3MERY9Q";     //  Enter the api key associated with where you want to connect to
​
const char *ssid =  "FTCNetwork";     // Use your own SSID and pass. (Will be changed to using IP address ASAP!)
const char *pass =  "111428813";
const char* server = "api.thingspeak.com"; // Enter the webite you want to send the data to
​
WiFiClient client;
​
void setup()
{
  Serial.begin(115200);
  delay(10);
​
  Serial.println("Connecting to ");
  Serial.println(ssid);
​
​
  WiFi.begin(ssid, pass);
​
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  pinMode(A0,INPUT);
}
​
void loop()
{
​
  int nReads = 10;
  int totSum = 0;
  for(int k = 0; k < nReads; k++){
    totSum += analogRead(A0);
    delay(1000);
  }
  int moisture=(((totSum / nReads)/900))*100; // This smooths out the sensor readings ten times with one second intervals (Can be increased or decreased.)
  if (client.connect(server, 80))  // This will operate when the server is connected with the ESP8266 allowing the POST string requests to go through
  {
​
    String postStr = apiKey;
    postStr += "&field1=";
    postStr += String(moisture);
    postStr += "\r\n\r\n";
​
    client.print("POST /update HTTP/1.1\n");
    client.print("Host: api.thingspeak.com\n");
    client.print("Connection: close\n");
    client.print("X-THINGSPEAKAPIKEY: " + apiKey + "\n");
    client.print("Content-Type: application/x-www-form-urlencoded\n");
    client.print("Content-Length: ");
    client.print(postStr.length());
    client.print("\n\n");
    client.print(postStr);
​
​
​
  }
  client.stop();
​
  Serial.println("Hooray! The request was sucessfully processed!");
​
  delay(50000);
}
