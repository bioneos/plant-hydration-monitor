
int sensorPin = A0;
int sensorVal = 0;
byte sensorVals[2];

void setup() 
{
  // put your setup code here, to run once:
  Serial.begin(9600);
}

void loop() 
{
  // Read in the value of the sensor
  sensorVal = analogRead(sensorPin);
  // Save the value as a byte array
  sensorVals[0] = lowByte(sensorVal);
  sensorVals[1] = highByte(sensorVal);

  // Write the byte array to the serial port
  Serial.write(sensorVals,2);

  // Delay 1 second
  delay(1000);
}
