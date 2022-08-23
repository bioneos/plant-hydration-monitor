#include <ESP8266WiFi.h>

// NOTE: Change these values to the WiFi values for your personal WiFi
const char SSID[] =  "12AshCt"; // Your current WiFi network SSID (can be hidden)
const char PASS[] =  "3196215249"; // Your current WiFi network password
const char *SERVER = "192.168.0.0"; // Your IP address on the WiFi network
const int SERVER_PORT = 3000;
const int SLEEP_MS = 5 * 60e6;

// Main loop process:
//   1) Wake from sleep
//   2) Read from the sensor NUM_READS times, READ_DELAY_APART second apart
//   3) Average readings for a value and POST back to the server
//   4) Sleep for WAIT_DELAY
const int NUM_READS = 10;
const int READ_DELAY_MS = 1000;
const int WAIT_DELAY_MS = 50000;

WiFiClient client;
void setup()
{
  // Turn on serial communication for logging
  // TODO: when in production mode we will want to disable serial output to save energy
  Serial.begin(115200);
  delay(10);

  Serial.print("\n\nConnecting to: ");
  Serial.println(SSID);

  int status = WL_IDLE_STATUS;

  // Connect to WiFi, checking status every 5 seconds
  // TODO: This can be improved to be more asynchronous
  while (status != WL_CONNECTED)
  {
    Serial.print(".");
    status = WiFi.begin(SSID, PASS);
    delay(5000);
  }
  Serial.println("");
  Serial.println("WiFi connected");

  // Setup the A0 pin to read the sensor analog value using ADC
  pinMode(A0, INPUT);
}

void loop()
{
  Serial.println("Starting soil moisture measurement...");
  // Read 10 values from the sensor, 1 second apart 
  int totSum = 0;
  for (int k = 0; k < NUM_READS; k++){
    totSum += analogRead(A0);
    // TODO: Should we go to deeper sleep here?
    delay(READ_DELAY_MS);
  }
  // This smooths out the sensor readings ten times with one second intervals
  // TODO: Let's review the reasoning behind this smoothing, not sure I understand 
  //   what we are doing here (or why). At a minimum we should get rid of the magic
  //   numbers so we can change the number of reads
  int moisture = ((totSum / NUM_READS) / 900) * 100; 
  Serial.println("Done: " + String(moisture));

  // Open a basic HTTP connection to the server
  Serial.println("Attempted to report moisture value of '" + String(moisture) + "' to server at: ");
  Serial.println("  " + String(SERVER) + ":" + String(SERVER_PORT));
  if (client.connect(SERVER, SERVER_PORT))  
  {
    // Create our POST request message Body content
    String postStr = "sensorVal=";
    postStr += String(moisture);

    // Send our POST request
    client.print("POST /saturation HTTP/1.1\n");
    client.print("Host: localhost\n");
    client.print("Connection: close\n");
    client.print("Content-Type: application/x-www-form-urlencoded\n");
    client.print("Content-Length: ");
    client.print(postStr.length());
    client.print("\n\n");
    client.print(postStr);

    // Close our HTTP connection
    client.stop();
    Serial.println("Hooray! The request was sucessfully processed!");
  }
  else
  {
    Serial.println("The request could not be processed or timed out.");  
  }
  
  // Wait in Deep Sleep before repeating the measurement (to save battery)
  // SEE ALSO: https://randomnerdtutorials.com/esp8266-deep-sleep-with-arduino-ide/
  // NOTE: disable this delay to enable the module to send sensor values every 10 seconds
  Serial.println("Dropping to Deep Sleep...");  
  ESP.deepSleep(SLEEP_MS); 
}
