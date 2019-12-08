# Introduction

Panel name: AFTMI-GrafanaPlugin-StateMachinePanel

This Grafana panel plugin is provided to visualize a state machine model defined by SCXML and show the current state or aggregate historical states based on the live data from AIM.

## 1. Instructions for development

* development: brazil-build dev
* production: brazil-build prod
* test: brazil-build test
* install&test&build: brazil-build

## 2. Instructions for plugin usage

   * Install
  
      Install the panel by unzipping the .zip file and put the whole directory (aftmi-grafanaplugin-statemachinepanel) underneath the plugins directory for Grafana. Typically, it’s `/usr/var/lib/grafana/plugins`. 
      
      You will need to install and setup the AIM connector datasource plugin.

      Restart Grafana by 
      
      `brew services restart grafana`

   * Input scxml && Select mode
  
   * Connect to AIM datasource, set the stream and query.
   * 
      Below is an exmple of stream and query:

      `Amazon/FC/SAT2/SmartPac/702/OEE/RAW/STATE`

      `select CurrentState as "value", semanticTimestamp from @stream`

   
## 3.Notes

  * The scxml defines the state machine model and states’ data should be retrieved from the corresponding stream, i.e, scxml, AIM stream and AIM JWT should all match.
  
  * Add multiple panels in a single dashboard. Each panel uses different display mode.
  
  * Change the Grafana theme if you want.

`configuration/preferences/UI theme`, choose the dark or light theme.
