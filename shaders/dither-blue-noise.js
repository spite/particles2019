const fs = `
#define LEVEL 15U
#define WIDTH ( (1U << LEVEL) )
#define AREA ( WIDTH * WIDTH )

uint part1by1 (uint x) {
    x = (x & 0x0000ffffu);
    x = ((x ^ (x << 8u)) & 0x00ff00ffu);
    x = ((x ^ (x << 4u)) & 0x0f0f0f0fu);
    x = ((x ^ (x << 2u)) & 0x33333333u);
    x = ((x ^ (x << 1u)) & 0x55555555u);
    return x;
}
    
uint pack_morton2x16(uvec2 v) {
  return part1by1(v.x) | (part1by1(v.y) << 1);
}

// from https://www.shadertoy.com/view/XtGBDW
uint HilbertIndex( uvec2 Position )
{   
    uvec2 Regions;
    uint Index = 0U;
    for( uint CurLevel = WIDTH/2U; CurLevel > 0U; CurLevel /= 2U )
    {
        uvec2 Region = uvec2(greaterThan((Position & uvec2(CurLevel)), uvec2(0U)));
        Index += CurLevel * CurLevel * ( (3U * Region.x) ^ Region.y);
        if( Region.y == 0U )
        {
            if( Region.x == 1U )
            {
                Position = uvec2(WIDTH - 1U) - Position;
            }
            Position.xy = Position.yx;
        }
    }
    
    return Index;
}
  
float ditherBlueNoise(float v, vec2 uv) {
  uint x = HilbertIndex(uvec2(uv) ) % (1u << 17u);
  float phi = 2.0/(sqrt(5.0)+1.0);
	float c = fract(0.5+phi*float(x));
  c = step(c,v);
  return c;
}`;

export { fs };
