import { AXIS_LEGEND_QUANTITY, CHART_OFFSET, MAX_POINTS } from '../constants/data';
import { ReanimatedGraphProps } from '../dto/graphDTO';

export const reducePoints = ( originalPoints : number[], maxPoints = MAX_POINTS ) => {

  'worklet';

  if ( originalPoints.length <= maxPoints ) {

    return originalPoints;

  }

  const points = [ originalPoints[0] ];

  for ( let i = 1; i <= maxPoints; ++i ) {

    const index = ( originalPoints.length - 1 ) * i / maxPoints;

    if ( Math.abs( index - Math.round( index ) ) < 0.00001 ) {

      points.push( originalPoints[index] );

    } else {

      const j = Math.floor( index );
      const a = index - Math.floor( index );
      const b = Math.ceil( index ) - index;

      points.push( originalPoints[j] * b + originalPoints[j + 1] * a );

    }

  }

  return points;

};

export const between = ( a: number, b: number, progress: number ) => {

  'worklet';

  return a + ( b - a ) * progress;

};

export const compareObjects = (
  a: any[] | { [key: string]: any },
  b: any[] | { [key: string]: any },
) => {

  'worklet';

  return JSON.stringify( a ) === JSON.stringify( b );

};

export const checkRatio = ( value: number ) => {

  'worklet';

  return Math.max( 0.1, Math.min( 1, value ) );

};

export const calculateExtremeValues = ( data: number[], quantity = AXIS_LEGEND_QUANTITY ) => {

  'worklet';

  const max = Math.max( ...data );
  const min = Math.min( ...data );

  const range = max - min;
  const idealStep = range / ( quantity - 1 );
  const exponent = Math.round( Math.log10( idealStep || 1 ) ) - 1;
  const stepMultiplier = 10 ** exponent;
  let roundedMax = Math.ceil( max / stepMultiplier ) * stepMultiplier;
  let roundedMin = Math.floor( min / stepMultiplier ) * stepMultiplier;
  let difference = ( roundedMax - roundedMin ) / ( quantity - 1 );
  let count = 10;

  while ( difference !== Math.round( difference * stepMultiplier ) / stepMultiplier && count ) {

    roundedMax += stepMultiplier;

    if ( difference !== Math.round( difference * stepMultiplier ) / stepMultiplier
      && roundedMin >= stepMultiplier ) {

      roundedMin -= stepMultiplier;

    }

    difference = ( roundedMax - roundedMin ) / ( quantity - 1 );
    count--;

  }

  const values = [];

  for ( let i = 0; i < quantity; i++ ) {

    values.push( Math.round( ( roundedMin + difference * i ) * 100 ) / 100 );

  }

  return {
    max: roundedMax,
    min: roundedMin,
    values,
  };

};

export const calculatePoints = (
  data: { from: { x: number, y: number }[], to: { x: number[], y: number[] } },
  progress: number,
  width: number,
  height: number,
  quantity = AXIS_LEGEND_QUANTITY,
) => {

  'worklet';

  const { from } = data;
  const { x, y } = data.to;
  const { max: maxY, min: minY } = calculateExtremeValues( y, quantity );

  if ( maxY === minY ) {

    return [
      { x: CHART_OFFSET, y: height - CHART_OFFSET },
      { x: width - CHART_OFFSET, y: height - CHART_OFFSET },
    ];

  }

  const step = {
    x: ( width - CHART_OFFSET * 2 ) / ( ( x.length - 1 ) || 1 ),
    y: ( height - CHART_OFFSET * 2 ) / ( ( maxY - minY ) || 1 ),
  };

  const newPoints = [];

  for ( let i = 0; i < y.length; i++ ) {

    if ( progress < 1 ) {

      const oldDataIndex = Math.floor( from.length / y.length * i );
      newPoints.push( {
        x: CHART_OFFSET + step.x * i,
        y: between( from[oldDataIndex].y, CHART_OFFSET + ( maxY - y[i] ) * step.y, progress ),
      } );

    } else {

      newPoints.push( {
        x: CHART_OFFSET + step.x * i,
        y: CHART_OFFSET + ( maxY - y[i] ) * step.y,
      } );

    }

  }

  return newPoints;

};

export const createPath = ( points: { x: number, y: number }[], type: ReanimatedGraphProps['type'] = 'curve' ) => {

  'worklet';

  const { length } = points;

  if ( !length ) {

    return 'M0 0, L0 0';

  }

  if ( length === 1 ) {

    return `M${points[0].x} ${points[0].y}, L${points[0].x} ${points[0].y}`;

  }

  const path = [ `M${points[0].x} ${points[0].y}` ];

  if ( type === 'line' ) {

    for ( let i = 1; i < length; i++ ) {

      path.push( `L${points[i].x} ${points[i].y}` );

    }

  } else {

    for ( let i = 0; i < length - 1; i++ ) {

      const previousPoint = points[Math.max( i - 1, 0 )];
      const point = points[i];
      const nextPoint = points[i + 1];
      const nextPoint2 = points[Math.min( i + 2, length - 1 )];

      path.push( `C
        ${( -previousPoint.x + nextPoint.x ) / 6 + point.x},
        ${( Math.max( -previousPoint.y + nextPoint.y, -1500 / length ) ) / 6 + point.y},
        ${( point.x - nextPoint2.x ) / 6 + nextPoint.x},
        ${( Math.min( point.y - nextPoint2.y, 1500 / length ) ) / 6 + nextPoint.y},
        ${nextPoint.x},${nextPoint.y},
      ` );

    }

  }

  return path.join( '' );

};

export const findNumbersAround = ( target: number, numbers: number[] ) => {

  'worklet';

  let startIndex = 0;
  let endIndex = numbers.length - 1;

  if ( numbers.includes( target ) ) {

    const index = numbers.indexOf( target );

    if ( index === 0 ) {

      return [ numbers[index], numbers[index + 1] ];

    }

    return [ numbers[index - 1], numbers[index] ];

  }

  while ( startIndex <= endIndex ) {

    const midIndex = Math.floor( ( startIndex + endIndex ) / 2 );
    const midValue = numbers[midIndex];

    if ( midValue === target ) {

      return [ numbers[midIndex - 1], midValue ];

    } if ( midValue < target ) {

      startIndex = midIndex + 1;

    } else {

      endIndex = midIndex - 1;

    }

  }

  return [ numbers[endIndex], numbers[startIndex] ];

};
