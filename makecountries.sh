#!/usr/bin/env bash

#
declare countries_to_move='["United States of America","Canada","Greenland","Antarctica","Russia"]'

# export replacement countries in low res
# can we do this with an env var?
#jq --arg jq_c_var $countries_to_move \ '[ (.features[] |  select (.properties.ADMIN inside $jq_c_var) )]' pp#_110.geojson > replacement.countries.json


jq '[ (.features[] |  select (.properties.ADMIN == "United States of America"  or .properties.ADMIN == "Canada"  or.properties.ADMIN == "Greenland"  or.properties.ADMIN == "Antarctica"  or .properties.ADMIN == "Russia") )]' pp_110.geojson > replacement.countries.json


# delete the countries from medium res that either are invalid -99 or that will be replaced 
jq 'del  (.features[] |  select ( .properties.ISO_A3_EH == "-99" or .properties.ADMIN == "Ashmore and Cartier Islands" or .properties.ADMIN == "United States of America"  or .properties.ADMIN == "Canada"  or.properties.ADMIN == "Greenland"  or.properties.ADMIN == "Antarctica"  or .properties.ADMIN == "Russia"))  ' pp_50.geojson >medium.removed.geojson

#add the low res version of the deleted countries
jq '.features += input' medium.removed.geojson replacement.countries.json > medium.lowadded.geojson

#export the high res versions of small countries
declare pred='.properties.ADMIN=="American Samoa" or .properties.ADMIN=="Andorra" or .properties.ADMIN=="Anguilla" or .properties.ADMIN=="Antigua and Barbuda" or .properties.ADMIN=="Aruba" or .properties.ADMIN=="Bahrain" or .properties.ADMIN=="Barbados" or .properties.ADMIN=="Bermuda" or .properties.ADMIN=="British Indian Ocean Territory" or .properties.ADMIN=="British Virgin Islands" or .properties.ADMIN=="Cayman Islands" or .properties.ADMIN=="Comoros" or .properties.ADMIN=="Cook Islands" or .properties.ADMIN=="Curaçao" or .properties.ADMIN=="Dominica" or .properties.ADMIN=="eSwatini" or .properties.ADMIN=="Federated States of Micronesia" or .properties.ADMIN=="Grenada" or .properties.ADMIN=="Guam" or .properties.ADMIN=="Guernsey" or .properties.ADMIN=="Heard Island and McDonald Islands" or .properties.ADMIN=="Hong Kong S.A.R." or .properties.ADMIN=="Indian Ocean Territories" or .properties.ADMIN=="Isle of Man" or .properties.ADMIN=="Jamaica" or .properties.ADMIN=="Jersey" or .properties.ADMIN=="Liechtenstein" or .properties.ADMIN=="Luxembourg" or .properties.ADMIN=="Macao S.A.R" or .properties.ADMIN=="Maldives" or .properties.ADMIN=="Malta" or .properties.ADMIN=="Marshall Islands" or .properties.ADMIN=="Mauritius" or .properties.ADMIN=="Monaco" or .properties.ADMIN=="Montserrat" or .properties.ADMIN=="Nauru" or 
.properties.ADMIN=="Niue" or .properties.ADMIN=="Norfolk Island" or .properties.ADMIN=="Northern Mariana Islands" or .properties.ADMIN=="Palau" or .properties.ADMIN=="Pitcairn Islands" or .properties.ADMIN=="Qatar" or .properties.ADMIN=="Saint Barthelemy" or .properties.ADMIN=="Saint Helena" or .properties.ADMIN=="Saint Kitts and Nevis" or .properties.ADMIN=="Saint Lucia" or .properties.ADMIN=="Saint Martin" or .properties.ADMIN=="Saint Pierre and Miquelon" or .properties.ADMIN=="Saint Vincent and the Grenadines" or .properties.ADMIN=="Samoa" or .properties.ADMIN=="San Marino" or .properties.ADMIN=="São Tomé and Principe" or .properties.ADMIN=="Seychelles" or .properties.ADMIN=="Singapore" or .properties.ADMIN=="Sint Maarten" or .properties.ADMIN=="Tonga" or .properties.ADMIN=="Trinidad and Tobago" or .properties.ADMIN=="Turks and Caicos Islands" or .properties.ADMIN=="Tuvalu" or .properties.ADMIN=="United States Virgin Islands" or .properties.ADMIN=="Vatican" or  .properties.ADMIN=="Wallis and Futuna"'

jq "[ (.features[] |  select ($pred) )]" pp_10.geojson >replacements.high.res.geojson

#delete those from the intermediate medium res file
jq "del  (.features[] |  select ( $pred))"  medium.lowadded.geojson >medium.smalls.removed.geojson

#add the high res versions
#add the low res version of the deleted countries
jq '.features += input' medium.smalls.removed.geojson replacements.high.res.geojson >final.geojson


