cp neighbors.txt neighbors.isoa3
bash -x iso3.sed
cp neighbors.isoa3 temp0
sed  's/^.....*/ZZZ/' temp0 > temp1
sed 's/$/,/' temp1 >temp2
sed 's/$/,/' temp1 >temp2
tr --delete '\n' <temp2 >temp3
sed 's/,[0-9]*,[0-9]*,[0-9]*,/=/g' temp3 >temp4
sed -E 's/([A-Za-z]*=)/\n\1/g' temp4 >temp5
grep -v '^ZZZ=' temp5 >temp6
sed 's/ZZZ,//g' temp6 >temp7
sed 's/,$//' temp7 >temp8
sed -E 's/(\w+)/\"\1\"/g' temp8 >temp9
sed 's/=/, [/' temp9 
sed 's/=/, [/' temp9  | sed 's/$/]);/' | sed 's/^/wikipediaMap.set(/' >temp10

