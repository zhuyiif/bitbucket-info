import { Component } from '@angular/core';
import {repoService} from './repoService';

@Component({
  selector: 'my-app',
  template: `<h1>Number of Repos {{repoData.length}}</h1>`,
  providers: [repoService]
})
export class AppComponent  
{ 
  name = 'Angular'; 

  repoData: any[] = ['2'];


  constructor(reService: repoService) {
     reService.getRepos().subscribe(res => {
               console.log("res = " +  JSON.stringify(res));
               this.repoData = res;
             });
    }

}
