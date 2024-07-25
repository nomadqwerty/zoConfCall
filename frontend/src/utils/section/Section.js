import { Row, Col } from 'react-bootstrap';
import styles from './section.module.scss'



const Section = ({ children, ...props}) => {

 const defaultClassName =
  props.section50?styles.section50:
  props.section100?styles.section100: 
  props.section25?styles.section25: 
  props.section20?styles.section20: 
  props.section15?styles.section15:
  props.centerRow?styles.centerRow:
  props.section75?styles.section75:
  props.p3?'p-3': props.mt3?'mt-3':'' ;
 
  
  return (
    <Row {...props} className={`
    ${styles.section} 
    ${defaultClassName}
    ${props.className}
    `} >
      {children}
    </Row>
  );
};
export default Section;
