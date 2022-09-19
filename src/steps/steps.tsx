import { computed, defineComponent, provide, reactive, ref, toRefs, VNode, watchEffect } from 'vue';
import isObject from 'lodash/isObject';
import props from './props';
import stepItemProps from './step-item-props';
import { TdStepItemProps } from './type';

import { usePrefixClass } from '../hooks/useConfig';
import useVModel from '../hooks/useVModel';
import { useChildComponentSlots } from '../hooks';

export default defineComponent({
  name: 'TSteps',
  props: { ...props },

  setup(props) {
    const COMPONENT_NAME = usePrefixClass('steps');

    const { current, modelValue } = toRefs(props);
    const [innerCurrent, setInnerCurrent] = useVModel(
      current,
      modelValue,
      props.defaultCurrent,
      props.onChange,
      'current',
    );

    provide(
      'StepsState',
      reactive({
        current: innerCurrent,
        setCurrent: setInnerCurrent,
      }),
    );

    provide('StepsProps', props);

    const indexMap = ref({});
    watchEffect(() => {
      if (!props.options) return;
      props.options?.forEach((item, index) => {
        if (item.value !== undefined) indexMap.value[item.value] = index;
      });
    });

    const handleStatus = (itemProps: TdStepItemProps, index: number) => {
      if (itemProps.status && itemProps.status !== 'default') return itemProps.status;
      if (innerCurrent.value === 'FINISH') return 'finish';
      // value 不存在时，使用 index 进行区分每一个步骤
      if (itemProps.value === undefined) {
        if (props.sequence === 'positive' && index < innerCurrent.value) return 'finish';
        if (props.sequence === 'reverse' && index > innerCurrent.value) return 'finish';
      }
      // value 存在，找匹配位置
      if (itemProps.value !== undefined) {
        const matchIndex = indexMap.value[innerCurrent.value];
        if (matchIndex === undefined) {
          console.warn('TDesign Steps Warn: The current `value` is not exist.');
          return 'default';
        }
        if (props.sequence === 'positive' && index < matchIndex) return 'finish';
        if (props.sequence === 'reverse' && index > matchIndex) return 'finish';
      }
      const key = itemProps.value === undefined ? index : itemProps.value;
      if (key === innerCurrent.value) return 'process';
      return 'default';
    };

    const getChildComponentByName = useChildComponentSlots();

    const getOptionListBySlots = (nodes: VNode[]) => {
      const arr: Array<TdStepItemProps> = [];
      nodes?.forEach((node) => {
        const option = node?.props || {};
        const children = node?.children;
        if (!option && !children) return;
        if (children && isObject(children)) {
          for (const key in children) {
            if (key in stepItemProps && !option[key]) {
              option[key] = children[key];
            }
          }
        }
        props.sequence === 'reverse' ? arr.unshift(option as TdStepItemProps) : arr.push(option as TdStepItemProps);
      });
      return arr;
    };
    const getOptions = () => {
      let options: Array<TdStepItemProps>;
      if (props.options?.length) {
        options = props.sequence === 'reverse' ? props.options.slice().reverse() : props.options;
      } else {
        const nodes: VNode[] = getChildComponentByName('StepItem') as VNode[];
        options = getOptionListBySlots(nodes);
      }
      return options;
    };

    const renderContent = () => {
      let content = null;
      const options = getOptions();
      const nodes: VNode[] = getChildComponentByName('StepItem') as VNode[];

      content = options.map((item, index) => {
        const stepIndex = props.sequence === 'reverse' ? options.length - index - 1 : index;

        const stepItem = (
          <t-step-item {...item} index={stepIndex} status={handleStatus(item, index)} key={item.value || index} />
        );

        if (nodes && nodes[index]) {
          const vnode = nodes[index];
          vnode.props = {
            ...item,
            index: stepIndex,
            status: handleStatus(item, index),
          };
          return vnode;
        }
        return stepItem;
      });

      return content;
    };

    /** class calculate */
    const handleTheme = () => {
      let { theme } = props;
      const options = getOptions();
      options.forEach((item) => {
        if (item?.icon !== undefined) {
          // icon > theme
          theme = 'default';
        }
      });
      return theme;
    };
    const baseClass = computed(() => {
      return [
        COMPONENT_NAME.value,
        `${COMPONENT_NAME.value}--${props.layout}`,
        `${COMPONENT_NAME.value}--${handleTheme()}-anchor`,
        `${COMPONENT_NAME.value}--${props.sequence}`,
        `${COMPONENT_NAME.value}--${props.separator}-separator`,
      ];
    });
    /** class calculate END */

    return () => <div class={baseClass.value}>{renderContent()}</div>;
  },
});
