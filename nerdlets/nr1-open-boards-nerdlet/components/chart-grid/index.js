import React from 'react';
import GridLayout from 'react-grid-layout';
import { writeUserDocument, writeAccountDocument } from '../../lib/utils';
import { DataConsumer } from '../../context/data';
import NrqlWidget from '../renderer/nrql-widget';
import BasicHTML from '../renderer/html-widget';
import { PlatformStateContext } from 'nr1';
import { timeRangeToNrql } from '@newrelic/nr1-community';
import { writeStyle, buildFilterClause } from './utils';
import EntityHdv from '../renderer/entity-hdv';

export default class ChartGrid extends React.Component {
  layoutUpdate = async (
    layout,
    selectedBoard,
    storageLocation,
    updateBoard
  ) => {
    const { document } = selectedBoard;
    // stitch new coordinates
    layout.forEach(w => {
      const id = w.i.split('_')[1];
      document.widgets[id].x = w.x || 0;
      document.widgets[id].y = w.y || 0;
      document.widgets[id].w = w.w || 6;
      document.widgets[id].h = w.h || 4;
    });

    switch (storageLocation.type) {
      case 'user': {
        const result = await writeUserDocument(
          'OpenBoards',
          selectedBoard.value,
          document
        );
        if (result && result.data) {
          updateBoard(document);
        }
        break;
      }
      case 'account': {
        const result = await writeAccountDocument(
          storageLocation.value,
          'OpenBoards',
          selectedBoard.value,
          document
        );
        if (result && result.data) {
          updateBoard(document);
        }
        break;
      }
    }
  };

  render() {
    const { height, width } = this.props;

    return (
      <PlatformStateContext.Consumer>
        {platformState => {
          const { timeRange } = platformState;
          const sinceClause = timeRangeToNrql({ timeRange });
          let begin_time = 0;
          let end_time = 0;

          if (timeRange.begin_time) begin_time = timeRange.begin_time;
          if (timeRange.end_time) end_time = timeRange.end_time;
          if (timeRange.duration) {
            end_time = Date.now();
            begin_time = end_time - timeRange.duration;
          }

          return (
            <DataConsumer>
              {({ selectedBoard, storageLocation, updateBoard, filters }) => {
                if (selectedBoard) {
                  const { document } = selectedBoard;
                  const dbFilters = document.filters || [];
                  const styles = document.styles || [];
                  styles.forEach(s => {
                    writeStyle(s.name, `.${s.name} * ${s.value}`);
                  });

                  const layout = (document.widgets || []).map((w, i) => {
                    return {
                      i: `w_${i}_${w.name}`,
                      x: w.x || 0,
                      y: w.y || 0,
                      w: w.w || 7,
                      h: w.h || 6,
                      type: w.type,
                      widget: w
                    };
                  });

                  const filterClause = buildFilterClause(filters, dbFilters);

                  const renderWidget = w => {
                    switch (w.type) {
                      case 'nrql': {
                        return (
                          <NrqlWidget
                            i={w.i}
                            widget={w.widget}
                            filterClause={filterClause}
                            sinceClause={sinceClause}
                            timeRange={timeRange}
                            begin_time={begin_time}
                            end_time={end_time}
                          />
                        );
                      }
                      case 'html': {
                        return <BasicHTML i={w.i} widget={w.widget} />;
                      }
                      case 'entityhdv': {
                        return <EntityHdv i={w.i} widget={w.widget} />;
                      }
                      default:
                        return 'unknown widget type';
                    }
                  };

                  return (
                    <div style={{ height: height - 61 }}>
                      <GridLayout
                        className="layout"
                        layout={layout}
                        cols={30}
                        rowHeight={30}
                        width={width}
                        onLayoutChange={l =>
                          this.layoutUpdate(
                            l,
                            selectedBoard,
                            storageLocation,
                            updateBoard
                          )
                        }
                      >
                        {layout.map(w => {
                          return (
                            <div
                              key={w.i}
                              style={{ backgroundColor: 'white' }}
                              // style={{ backgroundColor: 'rgb(240, 240, 240)' }}
                            >
                              {renderWidget(w)}
                            </div>
                          );
                        })}
                      </GridLayout>
                    </div>
                  );
                } else {
                  return (
                    <div
                      style={{
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ marginTop: '25%' }}>
                        <h2>Select or create a new Open Board to begin!</h2>
                      </div>
                    </div>
                  );
                }
              }}
            </DataConsumer>
          );
        }}
      </PlatformStateContext.Consumer>
    );
  }
}
// layout example
// const layout = [
//   {
//     i: 'a',
//     x: 0,
//     y: 0,
//     w: 1,
//     h: 2,
//     static: true
//   },
//   { i: 'b', x: 1, y: 0, w: 3, h: 2, minW: 2, maxW: 4 },
//   { i: 'c', x: 4, y: 0, w: 1, h: 2 },
//   { i: 'd', x: 4, y: 0, w: 1, h: 2 }
// ];
