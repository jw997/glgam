sed 's/flagicon/flag/ig' neighbors.wiki  | egrep  -o -e '\{flag\|[^}]*}'  -e '^\|[0-9]+'    | sed 's/{flag|//' | sed 's/}//' | sed 's/|//' > neighbors.txt
#cp neighbors.txt neighbors.isoa3
sed -e '23,28d;129,134d;145,161d;432,434d;622,637d;795,846d;1858,1865d;2286,2331d' neighbors.txt > neighbors.isoa3
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

