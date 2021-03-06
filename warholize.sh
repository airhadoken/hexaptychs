#!/bin/bash
#set -x

randadd() {
  echo "$((RANDOM % 200))%"
}

randxor() {
  echo "$((RANDOM % 50))%"
}

shade() {
  echo "rgb($((RANDOM % 128)),$((RANDOM % 128)),$((RANDOM % 128)))"
}

step1and2() {
  # Step 1: get a grayscale and recolor the pixels below the gamma 1.7 threshold as black
  # Step 2: Do a more nuanced 4-shade grayscale and find where it differens from the B&W
  echo "( +clone -grayscale Average -auto-gamma -gamma 1.7 -posterize 2 ) " \
       "( -clone 0 -grayscale Average -auto-gamma -gamma 1.7 -posterize 4 +clone -compose Minus -composite )"
}

step3() {
  # Step 3 PRESERVE THIS: Add 50% gray to make the areas gray & white instead of black & gray`
  echo "( +clone -fill gray(50%) -colorize 100 +clone -compose Plus -composite )"  
}

substep4() {
  xor=`randadd`
  add=`randadd`
  echo "-channel $1 -evaluate LeftShift 2 -evaluate Xor $xor -evaluate AddModulus $add "
}

step4() {
  # Step 4: reduce colors of original image.
  echo "( -clone 0  -evaluate Subtract 25% +dither -level 15%,85%,0.8 -colors 5 -paint 3" \
     `substep4 Red` \
     `substep4 Green` \
     `substep4 Blue` +channel \)
}

step5() {
   # Step 5: Colorize the gray areas with the 3 reduced colors from the original
   echo "( -clone ${1:-1},-1 -compose Colorize -composite )"
}

step6() {
   # Step 6 Add in at 50% opacity the black pixels from a different grayscale`
   rshade="`shade`,white"
   echo "( -clone 0 -grayscale Rec601Luma -auto-gamma -gamma 1.7 -posterize 2 -fill gray(50%) -opaque black" \
      "( -clone 0 -grayscale Average -auto-gamma -gamma 1.7 -posterize 2 -fill gray(50%) -opaque black )" \
      "-compose Linear_Burn -composite  -fuzz 30% -fill white -opaque white  " \
      "-ordered-dither h4x4a -posterize 2 -transparent white" \
      "+level-colors $rshade )"  
      #Line above we set the color of the black layer.  The first arg should be randomized`
}

step7() {
  # Step 7 PRESERVE THIS ONE final output
  echo "( -clone -2,-1 -compose Darken -composite )"  
}

continueloop() {
  echo `step4` `step5` `step6` `step7` -delete -4--2
}

# convert
convert $1 -resize 512x512 -colorspace sRGB \
           `step1and2` \
           `step3` \
           `step4` \
           `step5 -2` \
           `step6` \
           `step7` \
           `# Delete the unneeded intermediate steps.` \
           -delete 1,2,4,5,6 \
           `continueloop` \
           `continueloop` \
           `continueloop` \
           `continueloop` \
           `continueloop` \
           `#Below we assemble the six images into a horizontal arrangement, split with crop, ` \
           `# and then append vertically to create a 3x2 grid of images` \
           -delete 0-1 +append \
           -crop 50%x100% \
           -append \
           converted.jpg
